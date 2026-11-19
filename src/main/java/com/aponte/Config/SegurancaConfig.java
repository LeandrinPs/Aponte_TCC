package com.aponte.Config;

import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.*;

@Configuration
public class SegurancaConfig {
  @Bean
  SecurityFilterChain seguranca(HttpSecurity http, GoogleOAuthConfig google, com.aponte.Security.IdentidadeGoogle identidade) throws Exception {
    var entrada = new LoginUrlAuthenticationEntryPoint("/entra.html");
    var sucesso = new SavedRequestAwareAuthenticationSuccessHandler();
    sucesso.setDefaultTargetUrl("/map.html");
    var cache = new org.springframework.security.web.savedrequest.HttpSessionRequestCache();
    cache.setRequestMatcher(
        req -> req.getMethod().equals("GET") && java.util.Set.of("/favoritos.html", "/perfil.html").contains(req.getRequestURI()));
    http.requestCache(c -> c.requestCache(cache))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers("/admin", "/admin/**", "/api/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/favoritos.html", "/perfil.html", "/api/me", "/api/me/**")
                    .hasRole("USER")
                    .requestMatchers(
                        "/",
                        "/index.html",
                        "/map.html",
                        "/testemap.html",
                        "/catalo.html",
                        "/forma.html",
                        "/entra.html",
                        "/oauth2/authorization/google",
                        "/login/oauth2/code/google",
                        "/sobre.html",
                        "/privacidade.html",
                        "/termos.html",
                        "/error",
                        "/favicon.ico",
                        "/css/**",
                        "/js/**",
                        "/img/**",
                        "/imagens/**")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.GET,
                        "/api/csrf",
                        "/api/sessao",
                        "/api/estabelecimentos/**",
                        "/api/cardapios/**",
                        "/api/avaliacoes/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/usuarios")
                    .permitAll()
                    .anyRequest()
                    .denyAll())
        .formLogin(
            f ->
                f.loginPage("/entra.html")
                    .loginProcessingUrl("/login")
                    .failureUrl("/entra.html?erro")
                    .successHandler(
                        (req, res, auth) -> {
                          if (auth.getAuthorities().stream()
                              .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")))
                            res.sendRedirect("/admin");
                          else sucesso.onAuthenticationSuccess(req, res, auth);
                        })
                    .permitAll())
        .logout(l -> l.logoutUrl("/logout").logoutSuccessUrl("/index.html?saiu").permitAll())
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (req, res, ex) -> {
                          if (req.getRequestURI().startsWith("/api/"))
                            json(res, 401, "Entre na sua conta para continuar");
                          else entrada.commence(req, res, ex);
                        })
                    .accessDeniedHandler(
                        (req, res, ex) -> {
                          if (req.getRequestURI().startsWith("/api/"))
                            json(
                                res,
                                403,
                                "Operação não autorizada ou sessão expirada. Atualize a página");
                          else res.sendError(403, "Acesso restrito");
                        }));
    if (google.habilitado()) {
      http.oauth2Login(o -> o.loginPage("/entra.html")
          .userInfoEndpoint(u -> u.oidcUserService(identidade))
          .defaultSuccessUrl("/perfil.html", true)
          .failureHandler((req,res,e) -> {
            req.getSession().removeAttribute(com.aponte.Service.ContasGoogle.class.getName() + ".vinculo");
            String codigo = e instanceof org.springframework.security.oauth2.core.OAuth2AuthenticationException oauth
                && "conta_existente".equals(oauth.getError().getErrorCode()) ? "conta_existente" : "falha";
            res.sendRedirect("/entra.html?google=" + codigo);
          }));
    }
    // CSRF e proteção da sessão permanecem habilitados; fetch obtém o token em /api/csrf.
    return http.build();
  }

  private static void json(
      jakarta.servlet.http.HttpServletResponse res, int status, String mensagem)
      throws java.io.IOException {
    res.setStatus(status);
    res.setContentType("application/json;charset=UTF-8");
    res.getWriter().write("{\"mensagem\":\"" + mensagem + "\"}");
  }
}
