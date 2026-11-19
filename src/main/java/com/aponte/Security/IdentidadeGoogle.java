package com.aponte.Security;

import com.aponte.Service.ContasGoogle;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.oidc.userinfo.*;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class IdentidadeGoogle implements OAuth2UserService<OidcUserRequest, OidcUser> {
  private final ContasGoogle contas;
  private final HttpServletRequest request;
  private final OidcUserService padrao = new OidcUserService();
  @Override public OidcUser loadUser(OidcUserRequest requisicao) {
    return contas.autenticar(padrao.loadUser(requisicao), request.getSession(false));
  }
}
