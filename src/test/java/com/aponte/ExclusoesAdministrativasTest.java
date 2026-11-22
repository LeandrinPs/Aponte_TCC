package com.aponte;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.aponte.Entity.*;
import com.aponte.Repository.*;
import com.aponte.Security.PrincipalAponte;
import java.math.BigDecimal;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ExclusoesAdministrativasTest {
  @Autowired MockMvc mvc;
  @Autowired UsuarioRepository usuarios;
  @Autowired AdministradorRepository administradores;
  @Autowired EstabelecimentosRepository estabelecimentos;
  @Autowired FavoritosRepository favoritos;
  @Autowired AvaliacaoRepository avaliacoes;
  @Autowired CardapioRepository cardapios;
  org.springframework.security.core.userdetails.UserDetails admin;
  Usuario alvo, outro;
  Estabelecimentos local;

  @BeforeEach
  void preparar() {
    var a = new Administrador();
    a.setNome("exclusoes");
    a.setSenhahash("hash-de-fixture");
    admin = PrincipalAponte.administrador(administradores.saveAndFlush(a));
    alvo = usuario("alvo");
    outro = usuario("outro");
    local = new Estabelecimentos();
    local.setNome("Lugar próprio");
    local = estabelecimentos.saveAndFlush(local);
  }

  Usuario usuario(String nome) {
    var u = new Usuario();
    u.setNome(nome);
    u.setEmail(nome + "@exclusoes.test");
    u.setSenha("hash-de-fixture");
    return usuarios.saveAndFlush(u);
  }

  void favorito(Usuario u) {
    var f = new Favoritos();
    f.setUsuario(u);
    f.setEstabelecimento(local);
    favoritos.saveAndFlush(f);
  }

  void avaliacao(Usuario u) {
    var a = new Avaliacao();
    a.setUsuario(u);
    a.setEstabelecimento(local);
    a.setNota(4);
    avaliacoes.saveAndFlush(a);
  }

  void item() {
    var c = new Cardapio();
    c.setEstabelecimento(local);
    c.setNome("Prato");
    c.setDescricao("Descrição");
    c.setPreco(new BigDecimal("12.00"));
    cardapios.saveAndFlush(c);
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 1, 2, 3})
  void excluiUsuarioComCadaCombinacaoDeVinculosSemAfetarOutraConta(int mascara) throws Exception {
    if ((mascara & 1) != 0) favorito(alvo);
    if ((mascara & 2) != 0) avaliacao(alvo);
    favorito(outro);
    avaliacao(outro);
    mvc.perform(get("/api/admin/usuarios/" + alvo.getId() + "/exclusao").with(user(admin)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.permitida").value(true));
    mvc.perform(delete("/api/admin/usuarios/" + alvo.getId()).with(user(admin)).with(csrf()))
        .andExpect(status().isNoContent());
    assertThat(usuarios.existsById(alvo.getId())).isFalse();
    assertThat(favoritos.findByUsuario_Id(alvo.getId())).isEmpty();
    assertThat(avaliacoes.findByUsuario_Id(alvo.getId())).isEmpty();
    assertThat(usuarios.existsById(outro.getId())).isTrue();
    assertThat(favoritos.findByUsuario_Id(outro.getId())).hasSize(1);
    assertThat(avaliacoes.findByUsuario_Id(outro.getId())).hasSize(1);
    assertThat(estabelecimentos.existsById(local.getId())).isTrue();
  }

  @ParameterizedTest
  @ValueSource(strings = {"favorito", "avaliacao", "cardapio", "todos"})
  void explicaOsVinculosQueImpedemExcluirProprio(String tipo) throws Exception {
    if (tipo.equals("favorito") || tipo.equals("todos")) favorito(alvo);
    if (tipo.equals("avaliacao") || tipo.equals("todos")) avaliacao(alvo);
    if (tipo.equals("cardapio") || tipo.equals("todos")) item();
    mvc.perform(get("/api/admin/estabelecimentos/" + local.getId() + "/exclusao").with(user(admin)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.permitida").value(false));
    var r =
        mvc.perform(
                delete("/api/admin/estabelecimentos/" + local.getId())
                    .with(user(admin))
                    .with(csrf()))
            .andExpect(status().isConflict())
            .andReturn();
    String msg = r.getResponse().getContentAsString();
    if (tipo.equals("todos")) assertThat(msg).contains("favorito", "avaliação", "cardápio");
    else
      assertThat(msg)
          .contains(
              tipo.equals("avaliacao")
                  ? "avaliação"
                  : tipo.equals("cardapio") ? "cardápio" : "favorito");
    assertThat(estabelecimentos.existsById(local.getId())).isTrue();
  }

  @Test
  void excluiProprioLivre() throws Exception {
    mvc.perform(
            delete("/api/admin/estabelecimentos/" + local.getId()).with(user(admin)).with(csrf()))
        .andExpect(status().isNoContent());
    assertThat(estabelecimentos.existsById(local.getId())).isFalse();
  }

  @Test
  void revalidaVinculosCriadosDepoisDaPrevia() throws Exception {
    mvc.perform(get("/api/admin/estabelecimentos/" + local.getId() + "/exclusao").with(user(admin)))
        .andExpect(jsonPath("$.permitida").value(true));
    favorito(alvo);
    mvc.perform(
            delete("/api/admin/estabelecimentos/" + local.getId()).with(user(admin)).with(csrf()))
        .andExpect(status().isConflict());
  }

  @Test
  void referenciaGoogleNaoEExclusaoDeProprio() throws Exception {
    var ref = new Estabelecimentos();
    ref.setGooglePlaceId("Place-Referencia-Exclusao");
    ref = estabelecimentos.saveAndFlush(ref);
    mvc.perform(get("/api/admin/estabelecimentos/" + ref.getId() + "/exclusao").with(user(admin)))
        .andExpect(jsonPath("$.permitida").value(false));
    mvc.perform(delete("/api/admin/estabelecimentos/" + ref.getId()).with(user(admin)).with(csrf()))
        .andExpect(status().isConflict());
    assertThat(estabelecimentos.existsById(ref.getId())).isTrue();
  }

  @Test
  void previaExigeAdministradorEDeleteExigeCsrf() throws Exception {
    mvc.perform(get("/api/admin/usuarios/" + alvo.getId() + "/exclusao"))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            get("/api/admin/estabelecimentos/" + local.getId() + "/exclusao")
                .with(user(PrincipalAponte.usuario(alvo))))
        .andExpect(status().isForbidden());
    mvc.perform(delete("/api/admin/usuarios/" + alvo.getId()).with(user(admin)))
        .andExpect(status().isForbidden());
  }

  @Test
  void resumosPublicosUsamSomenteNotasAponteDeProprios() throws Exception {
    avaliacao(alvo);
    avaliacao(outro);
    mvc.perform(get("/api/estabelecimentos/avaliacoes"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(local.getId().intValue()))
        .andExpect(jsonPath("$[0].quantidade").value(2))
        .andExpect(jsonPath("$[0].media").value(4.0))
        .andExpect(jsonPath("$[0].usuarioId").doesNotExist());
  }
}
