package com.aponte;

import static org.assertj.core.api.Assertions.*;

import com.aponte.Entity.*;
import com.aponte.Repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

/** Confere a defesa no banco mesmo quando uma chamada não passa pelos Services. */
@DataJpaTest
@ActiveProfiles("test")
class RestricoesPersistenciaTest {
  @Autowired UsuarioRepository usuarios;
  @Autowired EstabelecimentosRepository estabelecimentos;
  @Autowired FavoritosRepository favoritos;
  @Autowired AvaliacaoRepository avaliacoes;

  Usuario usuario() {
    var u = new Usuario();
    u.setNome("Nome");
    u.setEmail("restricao@teste.test");
    u.setSenha("hash-teste");
    return usuarios.saveAndFlush(u);
  }

  Estabelecimentos google(String placeId) {
    var e = new Estabelecimentos();
    e.setGooglePlaceId(placeId);
    return estabelecimentos.saveAndFlush(e);
  }

  @Test
  void emailPossuiRestricaoUnicaNoBanco() {
    usuario();
    var repetido = new Usuario();
    repetido.setNome("Outro");
    repetido.setEmail("restricao@teste.test");
    repetido.setSenha("outro-hash");
    assertThatThrownBy(() -> usuarios.saveAndFlush(repetido))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void googlePlaceIdPossuiRestricaoUnicaNoBanco() {
    google("Place-Unico");
    assertThatThrownBy(() -> google("Place-Unico"))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void favoritoPossuiRestricaoUnicaDeUsuarioEEstabelecimento() {
    var u = usuario();
    var e = google("Place-Favorito");
    var a = new Favoritos();
    a.setUsuario(u);
    a.setEstabelecimento(e);
    favoritos.saveAndFlush(a);
    var b = new Favoritos();
    b.setUsuario(u);
    b.setEstabelecimento(e);
    assertThatThrownBy(() -> favoritos.saveAndFlush(b))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void avaliacaoPossuiRestricaoUnicaDeUsuarioEEstabelecimento() {
    var u = usuario();
    var e = google("Place-Avaliacao");
    var a = new Avaliacao();
    a.setUsuario(u);
    a.setEstabelecimento(e);
    a.setNota(4);
    avaliacoes.saveAndFlush(a);
    var b = new Avaliacao();
    b.setUsuario(u);
    b.setEstabelecimento(e);
    b.setNota(5);
    assertThatThrownBy(() -> avaliacoes.saveAndFlush(b))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void placeIdsSaoOpacosESensiveisAMaiusculas() {
    var a = google("Place-ABC");
    var b = google("Place-abc");
    assertThat(a.getId()).isNotEqualTo(b.getId());
    assertThat(estabelecimentos.findByGooglePlaceId("Place-ABC")).contains(a);
    assertThat(estabelecimentos.findByGooglePlaceId("Place-abc")).contains(b);
  }
}
