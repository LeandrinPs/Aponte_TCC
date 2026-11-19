package com.aponte.Config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.*;

/** A ausência das duas credenciais deixa somente o login local habilitado. */
@Configuration
public class GoogleOAuthConfig {
  private final String clientId;
  private final String clientSecret;

  public GoogleOAuthConfig(
      @Value("${aponte.google.client-id:}") String id,
      @Value("${aponte.google.client-secret:}") String secret) {
    clientId = id;
    clientSecret = secret;
  }

  public boolean habilitado() {
    return !clientId.isBlank() && !clientSecret.isBlank();
  }

  @Bean
  ClientRegistrationRepository clientesGoogle() {
    // Endpoints conhecidos do provedor; nenhuma descoberta HTTP é necessária ao iniciar sem OAuth.
    ClientRegistration google =
        habilitado()
            ? CommonOAuth2Provider.GOOGLE
                .getBuilder("google")
                .clientId(clientId)
                .clientSecret(clientSecret)
                .scope("openid", "profile", "email")
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .build()
            : null;
    return id -> "google".equals(id) ? google : null;
  }
}
