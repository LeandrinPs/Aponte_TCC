package com.aponte.Service;

import com.aponte.Config.GoogleOAuthConfig;
import com.aponte.Entity.Usuario;
import com.aponte.Repository.UsuarioRepository;
import com.aponte.Security.AcessoAtual;
import com.aponte.Security.PrincipalAponte;
import jakarta.servlet.http.HttpSession;
import java.io.Serializable;
import java.time.Instant;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Vinculação por sub; coincidência de e-mail nunca prova titularidade da conta local. */
@Service
@RequiredArgsConstructor
public class ContasGoogle {
  private static final String VINCULO = ContasGoogle.class.getName() + ".vinculo";

  private record Vinculo(Long usuarioId, Instant expira) implements Serializable {}

  private final UsuarioRepository usuarios;
  private final PasswordEncoder senhas;
  private final AcessoAtual acesso;
  private final GoogleOAuthConfig config;

  @Transactional(readOnly = true)
  public void prepararVinculo(String senhaAtual, HttpSession sessao) {
    if (!config.habilitado())
      throw new IllegalArgumentException("Login Google não configurado neste ambiente");
    Usuario u =
        usuarios
            .findById(acesso.usuarioId())
            .orElseThrow(() -> new AccessDeniedException("Conta indisponível"));
    if (u.getSenha() == null || senhaAtual == null || !senhas.matches(senhaAtual, u.getSenha()))
      throw new AccessDeniedException("Confirme a senha da sua conta local");
    sessao.setAttribute(VINCULO, new Vinculo(u.getId(), Instant.now().plusSeconds(300)));
  }

  /** Chamado somente após a validação OIDC de assinatura, issuer, state e nonce pelo Spring. */
  @Transactional
  public PrincipalAponte autenticar(OidcUser google, HttpSession sessao) {
    String sub = google.getSubject();
    String issuer = google.getIssuer() == null ? "" : google.getIssuer().toString();
    if (!(issuer.equals("https://accounts.google.com") || issuer.equals("accounts.google.com"))
        || sub == null
        || sub.isBlank()
        || sub.length() > 255
        || !Boolean.TRUE.equals(google.getEmailVerified()))
      throw erro("identidade_google_invalida");
    var existente = usuarios.findByGoogleSub(sub);
    Object pendente = sessao == null ? null : sessao.getAttribute(VINCULO);
    if (sessao != null) sessao.removeAttribute(VINCULO);
    if (pendente instanceof Vinculo v) {
      if (!v.expira().isAfter(Instant.now())) throw erro("vinculo_expirado");
      var local =
          usuarios.buscarParaAtualizar(v.usuarioId()).orElseThrow(() -> erro("conta_indisponivel"));
      if (existente.isPresent() && !existente.get().getId().equals(local.getId()))
        throw erro("google_ja_vinculado");
      if (local.getGoogleSub() != null && !local.getGoogleSub().equals(sub))
        throw erro("google_ja_vinculado");
      local.setGoogleSub(sub);
      Persistencia.gravar(() -> usuarios.saveAndFlush(local));
      return PrincipalAponte.google(local, google);
    }
    if (existente.isPresent()) return PrincipalAponte.google(existente.get(), google);
    String email = google.getEmail();
    if (email == null || email.length() > 50 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
      throw erro("email_google_invalido");
    email = email.strip().toLowerCase(Locale.ROOT);
    if (usuarios.existsByEmailIgnoreCase(email)) throw erro("conta_existente");
    Usuario novo = new Usuario();
    novo.setEmail(email);
    String nome = google.getFullName();
    novo.setNome(
        nome == null || nome.isBlank()
            ? "Usuário Aponte"
            : nome.substring(0, Math.min(50, nome.length())));
    novo.setGoogleSub(sub);
    // Não baixar nem persistir foto ou demais dados Google; o perfil pode receber upload próprio.
    return PrincipalAponte.google(Persistencia.gravar(() -> usuarios.saveAndFlush(novo)), google);
  }

  private static OAuth2AuthenticationException erro(String codigo) {
    return new OAuth2AuthenticationException(new OAuth2Error(codigo));
  }
}
