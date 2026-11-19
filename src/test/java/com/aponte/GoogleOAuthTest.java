package com.aponte;

import static org.assertj.core.api.Assertions.*;
import com.aponte.Entity.Usuario;
import com.aponte.Repository.UsuarioRepository;
import com.aponte.Security.*;
import com.aponte.Service.ContasGoogle;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.core.oidc.*;
import org.springframework.security.oauth2.core.oidc.user.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

/** Contrato após a validação OIDC do Spring; não simula login real na conta do Google. */
@SpringBootTest(properties={"aponte.google.client-id=cliente-teste", "aponte.google.client-secret=segredo-teste"})
@ActiveProfiles("test") @Transactional
class GoogleOAuthTest {
  @Autowired ContasGoogle google;
  @Autowired UsuarioRepository usuarios;
  @Autowired PasswordEncoder senhas;
  @AfterEach void limpar() { SecurityContextHolder.clearContext(); }
  OidcUser identidade(String sub, String email, boolean verificado) {
    var claims = new HashMap<String,Object>();
    claims.put("iss","https://accounts.google.com"); claims.put("sub",sub);
    claims.put("email",email); claims.put("email_verified",verificado); claims.put("name","Pessoa Google");
    return new DefaultOidcUser(List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_USER")),
        new OidcIdToken("token-simulado",Instant.now(),Instant.now().plusSeconds(300),claims));
  }
  Usuario local() {
    var u = new Usuario(); u.setNome("Local");u.setEmail("local@oauth.test");u.setSenha(senhas.encode("SenhaTeste123!"));
    return usuarios.saveAndFlush(u);
  }
  void entrar(Usuario u) {
    var p = PrincipalAponte.usuario(u);
    SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(p,null,p.getAuthorities()));
  }
  @Test void novoGoogleReutilizaIdPeloSubMesmoComOutroEmail() {
    var p = google.autenticar(identidade("sub-1","novo@oauth.test",true),new MockHttpSession());
    var outra = google.autenticar(identidade("sub-1","outro@oauth.test",true),new MockHttpSession());
    assertThat(outra.getId()).isEqualTo(p.getId());
    assertThat(usuarios.findById(p.getId()).orElseThrow().getSenha()).isNull();
    assertThat(p.isAdministrador()).isFalse();
  }
  @Test void coincidenciaDeEmailNaoVinculaAutomaticamente() {
    var u=local();
    assertThatThrownBy(() -> google.autenticar(identidade("sub-x",u.getEmail(),true),new MockHttpSession()))
        .isInstanceOf(OAuth2AuthenticationException.class);
    assertThat(u.getGoogleSub()).isNull();
  }
  @Test void vinculoComSenhaPreservaIdLocal() {
    var u=local(); entrar(u);var sessao=new MockHttpSession();
    google.prepararVinculo("SenhaTeste123!",sessao);
    var p=google.autenticar(identidade("sub-local","local@oauth.test",true),sessao);
    assertThat(p.getId()).isEqualTo(u.getId());assertThat(u.getGoogleSub()).isEqualTo("sub-local");
    assertThat(u.getSenha()).isNotNull();
  }
  @Test void senhaIncorretaOuEmailNaoVerificadoFalham() {
    var u=local();entrar(u);
    assertThatThrownBy(() -> google.prepararVinculo("incorreta",new MockHttpSession())).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    assertThatThrownBy(() -> google.autenticar(identidade("sub-x","outro@oauth.test",false),new MockHttpSession())).isInstanceOf(OAuth2AuthenticationException.class);
  }
}
