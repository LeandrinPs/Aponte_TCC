package com.aponte;

import static org.assertj.core.api.Assertions.*;

import com.aponte.Entity.*;
import com.aponte.Repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
class RepositoryValidationTest {
  @Autowired EntityManager em;
  @Autowired UsuarioRepository users;
  @Autowired EstabelecimentosRepository places;
  @Autowired AvaliacaoRepository reviews;
  @Autowired FavoritosRepository favorites;
  @Autowired AdministradorRepository admins;

  Usuario user() {
    Usuario u = new Usuario();
    u.setNome("Ana");
    u.setEmail("ana@teste.com");
    u.setSenha("teste");
    return em.merge(u);
  }

  Estabelecimentos place() {
    Estabelecimentos e = new Estabelecimentos();
    e.setNome("Café Central");
    e.setDescricao("Teste");
    e.setRua("Rua A");
    e.setNumero("1");
    e.setBairro("Centro");
    e.setCidade("Cidade");
    e.setEstado("SP");
    e.setCep("00000-000");
    e.setLatitude("-23");
    e.setLongitude("-46");
    return em.merge(e);
  }

  @Test
  void emailQueries() {
    Usuario u = user();
    em.flush();
    assertThat(users.findByEmail(u.getEmail())).contains(u);
    assertThat(users.existsByEmail(u.getEmail())).isTrue();
    assertThat(users.existsByEmail("ausente@teste.com")).isFalse();
  }

  @Test
  void establishmentQueries() {
    Estabelecimentos e = place();
    em.flush();
    assertThat(places.findByNomeContainingIgnoreCase("CAFÉ")).containsExactly(e);
    assertThat(places.findById(e.getId())).contains(e);
    assertThat(places.findAll()).containsExactly(e);
  }

  @Test
  void reviewQueries() {
    Usuario u = user();
    Estabelecimentos e = place();
    Avaliacao a = new Avaliacao();
    a.setUsuario(u);
    a.setEstabelecimento(e);
    a.setNota(5);
    em.persist(a);
    em.flush();
    assertThat(reviews.findByEstabelecimento_Id(e.getId())).containsExactly(a);
    assertThat(reviews.findByUsuario_Id(u.getId())).containsExactly(a);
    assertThat(reviews.findByUsuario_IdAndEstabelecimento_Id(u.getId(), e.getId())).contains(a);
    assertThat(reviews.existsByUsuario_IdAndEstabelecimento_Id(u.getId(), e.getId())).isTrue();
    assertThat(reviews.existsByUsuario_IdAndEstabelecimento_Id(-1L, e.getId())).isFalse();
  }

  @Test
  void favoriteQueriesAndDeletion() {
    Usuario u = user();
    Estabelecimentos e = place();
    Favoritos f = new Favoritos();
    f.setUsuario(u);
    f.setEstabelecimento(e);
    em.persist(f);
    em.flush();
    assertThat(favorites.findByUsuario_Id(u.getId())).containsExactly(f);
    assertThat(favorites.findByUsuario_IdAndEstabelecimento_Id(u.getId(), e.getId())).contains(f);
    assertThat(favorites.existsByUsuario_IdAndEstabelecimento_Id(u.getId(), e.getId())).isTrue();
    favorites.deleteByUsuario_IdAndEstabelecimento_Id(u.getId(), e.getId());
    em.flush();
    em.clear();
    assertThat(favorites.existsByUsuario_IdAndEstabelecimento_Id(u.getId(), e.getId())).isFalse();
    assertThat(users.findById(u.getId())).isPresent();
    assertThat(places.findById(e.getId())).isPresent();
  }

  @Test
  void administratorPersistence() {
    Administrador a = new Administrador();
    a.setNome("Admin");
    a.setSenhahash("hash");
    a = admins.saveAndFlush(a);
    assertThat(a.getId()).isNotNull();
    assertThat(admins.findById(a.getId())).contains(a);
  }
}
