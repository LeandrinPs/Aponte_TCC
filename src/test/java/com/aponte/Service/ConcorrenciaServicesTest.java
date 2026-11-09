package com.aponte.Service;

import static org.assertj.core.api.Assertions.*;

import com.aponte.DTO.*;
import com.aponte.Entity.Usuario;
import com.aponte.Exception.ConflitoException;
import com.aponte.Repository.*;
import com.aponte.Security.PrincipalAponte;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@ActiveProfiles("test")
class ConcorrenciaServicesTest {
  @Autowired UsuarioService usuarios;
  @Autowired EstabelecimentosService estabelecimentos;
  @Autowired FavoritosService favoritos;
  @Autowired AvaliacaoService avaliacoes;
  @Autowired UsuarioRepository usuarioRepo;
  @Autowired EstabelecimentosRepository estabelecimentoRepo;
  @Autowired FavoritosRepository favoritoRepo;
  @Autowired AvaliacaoRepository avaliacaoRepo;
  @Autowired PlatformTransactionManager transactionManager;
  Usuario usuario;
  String placeId;
  String email;

  @BeforeEach
  void preparar() {
    String sufixo = UUID.randomUUID().toString();
    placeId = "Place-" + sufixo;
    email = sufixo.substring(0, 8) + "@teste.test";
    Usuario u = new Usuario();
    u.setNome("Concorrência");
    u.setEmail(email);
    u.setSenha(ServicesIntegrationTest.HASH);
    usuario = usuarioRepo.saveAndFlush(u);
  }

  void autenticar() {
    var principal = PrincipalAponte.usuario(usuario);
    SecurityContextHolder.getContext()
        .setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(
                principal, null, principal.getAuthorities()));
  }

  @AfterEach
  void limpar() {
    SecurityContextHolder.clearContext();
    new TransactionTemplate(transactionManager)
        .executeWithoutResult(
            status -> {
              favoritoRepo.deleteByUsuario_Id(usuario.getId());
              avaliacaoRepo.deleteByUsuario_Id(usuario.getId());
              usuarioRepo.deleteById(usuario.getId());
              usuarioRepo.findByEmailIgnoreCase("novo-" + email).ifPresent(usuarioRepo::delete);
              estabelecimentoRepo
                  .findByGooglePlaceId(placeId)
                  .ifPresent(estabelecimentoRepo::delete);
            });
  }

  List<Boolean> executarSimultaneamente(Supplier<?> operacao) throws Exception {
    ExecutorService executor = Executors.newFixedThreadPool(2);
    CyclicBarrier inicio = new CyclicBarrier(2);
    try {
      Callable<Boolean> chamada =
          () -> {
            autenticar();
            try {
              inicio.await(10, TimeUnit.SECONDS);
              operacao.get();
              return true;
            } catch (ConflitoException esperado) {
              return false;
            } finally {
              SecurityContextHolder.clearContext();
            }
          };
      var a = executor.submit(chamada);
      var b = executor.submit(chamada);
      return List.of(a.get(20, TimeUnit.SECONDS), b.get(20, TimeUnit.SECONDS));
    } finally {
      executor.shutdownNow();
    }
  }

  @Test
  void placeIdConcorrenteNaoGeraDuasReferencias() throws Exception {
    var resultados =
        executarSimultaneamente(() -> estabelecimentos.obterOuCriarReferenciaGoogle(placeId));
    assertThat(resultados).contains(true);
    assertThat(
            estabelecimentoRepo.findAll().stream()
                .filter(e -> placeId.equals(e.getGooglePlaceId())))
        .hasSize(1);
  }

  @Test
  void favoritosConcorrentesNaoDuplicamParUsuarioEstabelecimento() throws Exception {
    autenticar();
    var local = estabelecimentos.obterOuCriarReferenciaGoogle(placeId);
    var ref = ReferenciaEstabelecimentoDTO.porId(local.id());
    assertThat(executarSimultaneamente(() -> favoritos.adicionar(ref)))
        .containsExactlyInAnyOrder(true, false);
    assertThat(favoritoRepo.findByUsuario_Id(usuario.getId())).hasSize(1);
  }

  @Test
  void avaliacoesConcorrentesNaoDuplicamParUsuarioEstabelecimento() throws Exception {
    autenticar();
    var local = estabelecimentos.obterOuCriarReferenciaGoogle(placeId);
    var ref = ReferenciaEstabelecimentoDTO.porId(local.id());
    assertThat(
            executarSimultaneamente(
                () -> avaliacoes.registrar(ref, new AvaliacaoDadosDTO(4, null))))
        .containsExactlyInAnyOrder(true, false);
    assertThat(avaliacaoRepo.findByUsuario_Id(usuario.getId())).hasSize(1);
  }

  @Test
  void cadastrosConcorrentesNaoDuplicamEmail() throws Exception {
    var dados = new UsuarioCadastroDTO("Novo", "novo-" + email, "Senha123!");
    assertThat(executarSimultaneamente(() -> usuarios.cadastrar(dados)))
        .containsExactlyInAnyOrder(true, false);
    assertThat(usuarioRepo.findAll().stream().filter(u -> u.getEmail().equals(dados.email())))
        .hasSize(1);
  }
}
