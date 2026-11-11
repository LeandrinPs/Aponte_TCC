package com.aponte.Service;

import static org.assertj.core.api.Assertions.*;

import com.aponte.DTO.*;
import com.aponte.Entity.*;
import com.aponte.Exception.*;
import com.aponte.Repository.*;
import com.aponte.Security.*;
import jakarta.validation.ConstraintViolationException;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ServicesIntegrationTest {
  static final String HASH = new BCryptPasswordEncoder(12).encode("Senha123!");
  static final ReferenciaEstabelecimentoDTO GOOGLE =
      ReferenciaEstabelecimentoDTO.google("ChIJ_Aponte_Teste");
  @Autowired UsuarioService usuarios;
  @Autowired EstabelecimentosService estabelecimentos;
  @Autowired FavoritosService favoritos;
  @Autowired AvaliacaoService avaliacoes;
  @Autowired CardapioService cardapios;
  @Autowired AdministradorService painel;
  @Autowired AutenticacaoAponte autenticacao;
  @Autowired PasswordEncoder senhas;
  @Autowired UsuarioRepository usuarioRepo;
  @Autowired AdministradorRepository adminRepo;
  @Autowired EstabelecimentosRepository estabelecimentoRepo;
  @Autowired FavoritosRepository favoritoRepo;
  @Autowired AvaliacaoRepository avaliacaoRepo;
  @Autowired CardapioRepository cardapioRepo;
  Usuario ana;
  Usuario bia;
  Administrador admin;

  @BeforeEach
  void preparar() {
    SecurityContextHolder.clearContext();
    ana = novoUsuario("Ana", "ana@aponte.test");
    bia = novoUsuario("Bia", "bia@aponte.test");
    admin = new Administrador();
    admin.setNome("administrador");
    admin.setSenhahash(HASH);
    admin = adminRepo.saveAndFlush(admin);
  }

  @AfterEach
  void limparContexto() {
    SecurityContextHolder.clearContext();
  }

  Usuario novoUsuario(String nome, String email) {
    Usuario u = new Usuario();
    u.setNome(nome);
    u.setEmail(email);
    u.setSenha(HASH);
    return usuarioRepo.saveAndFlush(u);
  }

  void autenticar(PrincipalAponte principal) {
    SecurityContextHolder.getContext()
        .setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities()));
  }

  void comoAna() {
    autenticar(PrincipalAponte.usuario(ana));
  }

  void comoBia() {
    autenticar(PrincipalAponte.usuario(bia));
  }

  void comoAdmin() {
    autenticar(PrincipalAponte.administrador(admin));
  }

  static DadosEstabelecimentoDTO dadosProprios() {
    return new DadosEstabelecimentoDTO(
        "Restaurante Aponte",
        "Cadastro próprio",
        "Rua A",
        "1",
        "Centro",
        "Cidade",
        "SP",
        "00000-000",
        "-23.55",
        "-46.63");
  }

  static CardapioDadosDTO item(String preco) {
    return new CardapioDadosDTO("Prato", "Descrição própria", new BigDecimal(preco));
  }

  @Test
  void cadastroNormalizaEmailEArmazenaSomenteHash() {
    var resposta =
        usuarios.cadastrar(new UsuarioCadastroDTO("Clara", "Clara@aponte.test", "Senha123!"));
    var salva = usuarioRepo.findById(resposta.id()).orElseThrow();
    assertThat(resposta.email()).isEqualTo("clara@aponte.test");
    assertThat(salva.getSenha()).isNotEqualTo("Senha123!").hasSize(60);
    assertThat(senhas.matches("Senha123!", salva.getSenha())).isTrue();
    var mapper = JsonMapper.builder().build();
    assertThat(mapper.writeValueAsString(resposta)).doesNotContain("senha", salva.getSenha());
    assertThat(mapper.writeValueAsString(salva)).doesNotContain("senha", salva.getSenha());
    assertThat(salva.toString()).doesNotContain(salva.getSenha());
    assertThat(new UsuarioCadastroDTO("N", "n@teste.test", "Senha123!").toString())
        .doesNotContain("Senha123!");
    assertThat(mapper.writeValueAsString(new UsuarioCadastroDTO("N", "n@teste.test", "Senha123!")))
        .doesNotContain("senha", "Senha123!");
  }

  @Test
  void cadastroRecusaEmailDuplicadoSemDistinguirMaiusculas() {
    assertThatThrownBy(
            () ->
                usuarios.cadastrar(
                    new UsuarioCadastroDTO("Outra Ana", "ANA@aponte.test", "Senha123!")))
        .isInstanceOf(ConflitoException.class);
  }

  @Test
  void senhaMultibyteNaoPodeUltrapassarLimiteDoBcrypt() {
    assertThatThrownBy(
            () -> usuarios.cadastrar(new UsuarioCadastroDTO("C", "c@teste.test", "á".repeat(40))))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("72 bytes");
  }

  @Test
  void leituraDeUsuariosRespeitaProprietarioEAdministrador() {
    comoAna();
    assertThat(usuarios.buscarMeuPerfil().id()).isEqualTo(ana.getId());
    assertThat(usuarios.buscarPorId(ana.getId()).email()).isEqualTo(ana.getEmail());
    assertThatThrownBy(() -> usuarios.buscarPorId(bia.getId()))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(usuarios::listar).isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> usuarios.buscarPorEmail(bia.getEmail()))
        .isInstanceOf(AccessDeniedException.class);
    comoAdmin();
    assertThat(painel.listarUsuarios()).hasSize(2);
    assertThat(usuarios.buscarPorEmail("BIA@aponte.test").id()).isEqualTo(bia.getId());
  }

  @Test
  void atualizacaoPropriaNaoAlteraSenhaNemPermiteEmailDuplicado() {
    comoAna();
    var resposta =
        usuarios.atualizarMeuPerfil(new UsuarioAtualizacaoDTO("Ana Maria", "ANA@aponte.test"));
    assertThat(resposta.nome()).isEqualTo("Ana Maria");
    assertThat(usuarioRepo.findById(ana.getId()).orElseThrow().getSenha()).isEqualTo(HASH);
    assertThatThrownBy(
            () -> usuarios.atualizarMeuPerfil(new UsuarioAtualizacaoDTO("Ana", bia.getEmail())))
        .isInstanceOf(ConflitoException.class);
  }

  @Test
  void trocaDeSenhaExigeSenhaAtualEGravaNovoHash() {
    comoAna();
    usuarios.alterarMinhaSenha("Senha123!", "NovaSenha456!");
    var salva = usuarioRepo.findById(ana.getId()).orElseThrow();
    assertThat(senhas.matches("NovaSenha456!", salva.getSenha())).isTrue();
    assertThatThrownBy(() -> usuarios.alterarMinhaSenha("incorreta", "OutraSenha123!"))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  void usuarioInexistenteGeraErroDeNegocio() {
    comoAdmin();
    assertThatThrownBy(() -> painel.buscarUsuario(Long.MAX_VALUE))
        .isInstanceOf(RecursoNaoEncontradoException.class);
    assertThatThrownBy(() -> usuarios.buscarPorEmail("ausente@teste.test"))
        .isInstanceOf(RecursoNaoEncontradoException.class);
    assertThatThrownBy(
            () ->
                usuarios.atualizarComoAdministrador(
                    Long.MAX_VALUE, new UsuarioAtualizacaoDTO("Nome", "novo@teste.test")))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }

  @Test
  void referenciaGoogleEhReutilizadaESomentePlaceIdEhArmazenado() {
    comoAna();
    var primeira = estabelecimentos.obterOuCriarReferenciaGoogle(GOOGLE.googlePlaceId());
    var segunda = estabelecimentos.obterOuCriarReferenciaGoogle(GOOGLE.googlePlaceId());
    assertThat(segunda.id()).isEqualTo(primeira.id());
    assertThat(segunda.dadosProprios()).isNull();
    var entidade = estabelecimentoRepo.findById(primeira.id()).orElseThrow();
    assertThat(entidade.getNome()).isNull();
    assertThat(entidade.getRua()).isNull();
    assertThat(entidade.getLatitude()).isNull();
    assertThat(entidade.getLongitude()).isNull();
    assertThat(estabelecimentos.existeGooglePlaceId(GOOGLE.googlePlaceId())).isTrue();
    assertThat(estabelecimentos.buscarPorGooglePlaceId(GOOGLE.googlePlaceId()).id())
        .isEqualTo(primeira.id());
    assertThat(estabelecimentoRepo.count()).isEqualTo(1);
  }

  @Test
  void consultasPublicasDeGoogleDesconhecidoNaoCriamReferencia() {
    assertThat(cardapios.listar(GOOGLE)).isEmpty();
    assertThat(avaliacoes.listarPorEstabelecimento(GOOGLE)).isEmpty();
    assertThat(avaliacoes.resumir(GOOGLE)).isEqualTo(new ResumoAvaliacoesDTO(0, null));
    assertThat(estabelecimentos.existeGooglePlaceId(GOOGLE.googlePlaceId())).isFalse();
    assertThat(estabelecimentoRepo.count()).isZero();
    assertThatThrownBy(() -> estabelecimentos.buscarPorGooglePlaceId(GOOGLE.googlePlaceId()))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }

  @Test
  void semAutenticacaoNaoPodeCriarReferenciaNemFavoritar() {
    assertThatThrownBy(() -> estabelecimentos.obterOuCriarReferenciaGoogle(GOOGLE.googlePlaceId()))
        .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    assertThatThrownBy(() -> favoritos.adicionar(GOOGLE))
        .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
  }

  @Test
  void cadastroProprioPodeSerMantidoPeloAdministrador() {
    comoAdmin();
    var criado = painel.cadastrarEstabelecimento(dadosProprios());
    assertThat(criado.googlePlaceId()).isNull();
    assertThat(criado.dadosProprios().nome()).isEqualTo("Restaurante Aponte");
    assertThat(painel.atualizarEstabelecimento(criado.id(), dadosProprios()).id())
        .isEqualTo(criado.id());
    painel.excluirEstabelecimento(criado.id());
    assertThat(estabelecimentoRepo.existsById(criado.id())).isFalse();
  }

  @Test
  void administradorNaoPodeAlterarOuExcluirReferenciaGoogle() {
    comoAdmin();
    var referencia = estabelecimentos.obterOuCriarReferenciaGoogle(GOOGLE.googlePlaceId());
    assertThatThrownBy(() -> painel.atualizarEstabelecimento(referencia.id(), dadosProprios()))
        .isInstanceOf(ConflitoException.class);
    assertThatThrownBy(() -> painel.excluirEstabelecimento(referencia.id()))
        .isInstanceOf(ConflitoException.class);
  }

  @ParameterizedTest
  @ValueSource(strings = {"favorito", "avaliacao", "cardapio"})
  void exclusaoDeCadastroProprioComVinculosEhBloqueada(String tipo) {
    comoAdmin();
    var proprio = estabelecimentos.cadastrarProprio(dadosProprios());
    var referencia = ReferenciaEstabelecimentoDTO.porId(proprio.id());
    if (tipo.equals("cardapio")) cardapios.cadastrar(referencia, item("0.00"));
    else {
      comoAna();
      if (tipo.equals("favorito")) favoritos.adicionar(referencia);
      else avaliacoes.registrar(referencia, new AvaliacaoDadosDTO(4, null));
    }
    comoAdmin();
    assertThatThrownBy(() -> estabelecimentos.excluirProprio(proprio.id()))
        .isInstanceOf(ConflitoException.class);
  }

  @Test
  void favoritoDuplicadoEhRecusado() {
    comoAna();
    favoritos.adicionar(GOOGLE);
    assertThatThrownBy(() -> favoritos.adicionar(GOOGLE)).isInstanceOf(ConflitoException.class);
    assertThat(favoritoRepo.count()).isEqualTo(1);
  }

  @Test
  void removerFavoritoNaoExcluiEstabelecimentoNemFavoritoDeOutroUsuario() {
    comoAna();
    var primeiro = favoritos.adicionar(GOOGLE);
    comoBia();
    favoritos.adicionar(GOOGLE);
    assertThat(favoritos.listarMeus())
        .extracting(FavoritoDTO::usuarioId)
        .containsExactly(bia.getId());
    comoAna();
    favoritos.remover(GOOGLE);
    assertThat(favoritos.existe(GOOGLE)).isFalse();
    assertThat(estabelecimentoRepo.existsById(primeiro.estabelecimento().id())).isTrue();
    comoBia();
    assertThat(favoritos.existe(GOOGLE)).isTrue();
  }

  @Test
  void favoritoOuEstabelecimentoInexistenteGeraErro() {
    comoAna();
    assertThatThrownBy(() -> favoritos.remover(GOOGLE))
        .isInstanceOf(RecursoNaoEncontradoException.class);
    assertThatThrownBy(
            () -> favoritos.adicionar(ReferenciaEstabelecimentoDTO.porId(Long.MAX_VALUE)))
        .isInstanceOf(RecursoNaoEncontradoException.class);
    assertThat(favoritos.existe(GOOGLE)).isFalse();
  }

  @Test
  void contaRemovidaNaoContinuaAutorizadaPelaSessao() {
    comoAna();
    usuarioRepo.delete(ana);
    usuarioRepo.flush();
    assertThatThrownBy(favoritos::listarMeus).isInstanceOf(RecursoNaoEncontradoException.class);
  }

  @Test
  void permiteUmaAvaliacaoPorUsuarioEEstabelecimento() {
    comoAna();
    avaliacoes.registrar(GOOGLE, new AvaliacaoDadosDTO(5, "Bom"));
    assertThatThrownBy(() -> avaliacoes.registrar(GOOGLE, new AvaliacaoDadosDTO(3, "Outra")))
        .isInstanceOf(ConflitoException.class);
    assertThat(avaliacaoRepo.count()).isEqualTo(1);
  }

  @Test
  void mediaContagemEEdicaoUsamSomenteAvaliacoesDoAponte() {
    comoAna();
    var primeira = avaliacoes.registrar(GOOGLE, new AvaliacaoDadosDTO(3, " Bom "));
    assertThat(primeira.comentario()).isEqualTo("Bom");
    comoBia();
    avaliacoes.registrar(GOOGLE, new AvaliacaoDadosDTO(5, null));
    assertThat(avaliacoes.calcularMedia(GOOGLE)).isEqualTo(4.0);
    assertThat(avaliacoes.contar(GOOGLE)).isEqualTo(2);
    comoAna();
    var editada = avaliacoes.editarMinha(primeira.id(), new AvaliacaoDadosDTO(4, "  "));
    assertThat(editada.comentario()).isNull();
    assertThat(avaliacoes.resumir(GOOGLE)).isEqualTo(new ResumoAvaliacoesDTO(2, 4.5));
    avaliacoes.excluirMinha(primeira.id());
    assertThat(avaliacoes.resumir(GOOGLE)).isEqualTo(new ResumoAvaliacoesDTO(1, 5.0));
  }

  @Test
  void outroUsuarioNaoPodeEditarOuExcluirAvaliacao() {
    comoAna();
    var avaliacao = avaliacoes.registrar(GOOGLE, new AvaliacaoDadosDTO(5, null));
    comoBia();
    assertThatThrownBy(() -> avaliacoes.editarMinha(avaliacao.id(), new AvaliacaoDadosDTO(1, null)))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> avaliacoes.excluirMinha(avaliacao.id()))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> avaliacoes.listarPorUsuario(ana.getId()))
        .isInstanceOf(AccessDeniedException.class);
    comoAdmin();
    assertThat(avaliacoes.listarPorUsuario(ana.getId())).hasSize(1);
    painel.removerAvaliacao(avaliacao.id());
    assertThat(avaliacoes.resumir(GOOGLE)).isEqualTo(new ResumoAvaliacoesDTO(0, null));
  }

  @Test
  void avaliacaoInexistenteGeraErro() {
    comoAna();
    assertThatThrownBy(() -> avaliacoes.editarMinha(Long.MAX_VALUE, new AvaliacaoDadosDTO(4, null)))
        .isInstanceOf(RecursoNaoEncontradoException.class);
    assertThatThrownBy(() -> avaliacoes.excluirMinha(Long.MAX_VALUE))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }

  @Test
  void cardapioProprioPodeSerVinculadoAoGoogleEConsultadoPublicamente() {
    comoAdmin();
    var item = cardapios.cadastrar(GOOGLE, item("12.50"));
    assertThat(item.estabelecimento().googlePlaceId()).isEqualTo(GOOGLE.googlePlaceId());
    assertThat(cardapios.atualizar(item.id(), item("0.00")).preco()).isEqualByComparingTo("0");
    SecurityContextHolder.clearContext();
    assertThat(cardapios.listar(GOOGLE)).hasSize(1);
    assertThat(cardapios.buscarPorId(item.id()).nome()).isEqualTo("Prato");
    comoAdmin();
    cardapios.excluir(item.id());
    assertThat(cardapios.listar(GOOGLE)).isEmpty();
    assertThat(estabelecimentoRepo.existsById(item.estabelecimento().id())).isTrue();
  }

  @Test
  void manutencaoAdministrativaEhNegadaParaUsuarios() {
    comoAna();
    assertThatThrownBy(() -> cardapios.cadastrar(GOOGLE, item("12.00")))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> cardapios.excluir(Long.MAX_VALUE))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> painel.cadastrarEstabelecimento(dadosProprios()))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> usuarios.excluir(bia.getId()))
        .isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(() -> painel.removerAvaliacao(Long.MAX_VALUE))
        .isInstanceOf(AccessDeniedException.class);
  }

  @Test
  void itemDeCardapioInexistenteGeraErro() {
    assertThatThrownBy(() -> cardapios.buscarPorId(Long.MAX_VALUE))
        .isInstanceOf(RecursoNaoEncontradoException.class);
    comoAdmin();
    assertThatThrownBy(() -> cardapios.atualizar(Long.MAX_VALUE, item("10.00")))
        .isInstanceOf(RecursoNaoEncontradoException.class);
  }

  @Test
  void exclusaoAdministrativaDeUsuarioPreservaRegistrosCompartilhados() {
    comoAna();
    var favorito = favoritos.adicionar(GOOGLE);
    avaliacoes.registrar(GOOGLE, new AvaliacaoDadosDTO(3, "Comentário"));
    comoBia();
    favoritos.adicionar(GOOGLE);
    avaliacoes.registrar(GOOGLE, new AvaliacaoDadosDTO(5, null));
    comoAdmin();
    cardapios.cadastrar(GOOGLE, item("12.00"));
    painel.excluirUsuario(ana.getId());
    assertThat(usuarioRepo.existsById(ana.getId())).isFalse();
    assertThat(favoritoRepo.findByUsuario_Id(ana.getId())).isEmpty();
    assertThat(avaliacaoRepo.findByUsuario_Id(ana.getId())).isEmpty();
    assertThat(favoritoRepo.findByUsuario_Id(bia.getId())).hasSize(1);
    assertThat(avaliacoes.resumir(GOOGLE)).isEqualTo(new ResumoAvaliacoesDTO(1, 5.0));
    assertThat(estabelecimentoRepo.existsById(favorito.estabelecimento().id())).isTrue();
    assertThat(cardapios.listar(GOOGLE)).hasSize(1);
  }

  @Test
  void autenticacaoLocalValidaHashEDistingueAdministradorDeUsuario() {
    var provider = new DaoAuthenticationProvider(autenticacao);
    provider.setPasswordEncoder(senhas);
    var auth =
        provider.authenticate(
            UsernamePasswordAuthenticationToken.unauthenticated(ana.getEmail(), "Senha123!"));
    assertThat(auth.getPrincipal()).isInstanceOf(PrincipalAponte.class);
    assertThat(((PrincipalAponte) auth.getPrincipal()).isAdministrador()).isFalse();
    var adm = autenticacao.loadUserByUsername("admin:" + admin.getNome());
    assertThat(adm.getAuthorities())
        .extracting(a -> a.getAuthority())
        .containsExactly("ROLE_ADMIN");
    autenticar((PrincipalAponte) adm);
    assertThatThrownBy(favoritos::listarMeus).isInstanceOf(AccessDeniedException.class);
    assertThatThrownBy(
            () ->
                provider.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(ana.getEmail(), "errada")))
        .isInstanceOf(BadCredentialsException.class);
    assertThat(adm.toString()).doesNotContain(HASH);
  }

  @Test
  void administradorComNomeAmbiguoNaoEhAutenticado() {
    Administrador duplicado = new Administrador();
    duplicado.setNome(admin.getNome());
    duplicado.setSenhahash(HASH);
    adminRepo.saveAndFlush(duplicado);
    assertThatThrownBy(() -> autenticacao.loadUserByUsername("admin:" + admin.getNome()))
        .isInstanceOf(UsernameNotFoundException.class);
  }

  @Test
  void identidadeGenericaOuOAuthNaoAssociadaNaoRecebePrivilegiosLocais() {
    var generico = User.withUsername("ana@aponte.test").password(HASH).roles("ADMIN").build();
    SecurityContextHolder.getContext()
        .setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(
                generico, null, generico.getAuthorities()));
    assertThatThrownBy(painel::listarUsuarios).isInstanceOf(AccessDeniedException.class);
  }

  @ParameterizedTest
  @NullSource
  @ValueSource(ints = {0, 6, -1})
  void validaLimitesDaNota(Integer nota) {
    comoAna();
    assertThatThrownBy(() -> avaliacoes.registrar(GOOGLE, new AvaliacaoDadosDTO(nota, null)))
        .isInstanceOf(ConstraintViolationException.class);
    assertThat(estabelecimentoRepo.count()).isZero();
  }

  @Test
  void validaTamanhoDoComentarioEDadosDeUsuario() {
    comoAna();
    assertThatThrownBy(
            () -> avaliacoes.registrar(GOOGLE, new AvaliacaoDadosDTO(4, "a".repeat(1001))))
        .isInstanceOf(ConstraintViolationException.class);
    assertThatThrownBy(() -> usuarios.cadastrar(new UsuarioCadastroDTO(" ", "invalido", "123")))
        .isInstanceOf(ConstraintViolationException.class);
  }

  @ParameterizedTest
  @ValueSource(strings = {"-0.01", "1.001", "100000000.00"})
  void validaPrecoSemArredondamentoSilencioso(String preco) {
    comoAdmin();
    assertThatThrownBy(() -> cardapios.cadastrar(GOOGLE, item(preco)))
        .isInstanceOf(ConstraintViolationException.class);
  }

  @Test
  void validaNomeDescricaoPrecoECoordenadas() {
    comoAdmin();
    assertThatThrownBy(() -> cardapios.cadastrar(GOOGLE, new CardapioDadosDTO(" ", "", null)))
        .isInstanceOf(ConstraintViolationException.class);
    var invalido =
        new DadosEstabelecimentoDTO("N", "D", "R", "1", "B", "C", "SP", "0", "91", "-181");
    assertThatThrownBy(() -> estabelecimentos.cadastrarProprio(invalido))
        .isInstanceOf(ConstraintViolationException.class);
  }

  @Test
  void validaIdentificadoresInternosEGoogleSemRestringirPrefixo() {
    comoAna();
    for (var ref :
        List.of(
            new ReferenciaEstabelecimentoDTO(null, null),
            new ReferenciaEstabelecimentoDTO(1L, "Place"),
            new ReferenciaEstabelecimentoDTO(-1L, null),
            ReferenciaEstabelecimentoDTO.google(" "),
            ReferenciaEstabelecimentoDTO.google("a".repeat(256)))) {
      assertThatThrownBy(() -> favoritos.adicionar(ref))
          .isInstanceOf(ConstraintViolationException.class);
    }
    var ref = estabelecimentos.obterOuCriarReferenciaGoogle("Place-sem-prefixo-fixo");
    assertThat(ref.googlePlaceId()).isEqualTo("Place-sem-prefixo-fixo");
  }
}
