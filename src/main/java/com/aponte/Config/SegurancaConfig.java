package com.aponte.Config;

import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.*;

@Configuration
public class SegurancaConfig {
  @Bean
  SecurityFilterChain seguranca(HttpSecurity http) throws Exception {
    var entrada = new LoginUrlAuthenticationEntryPoint("/entra.html");
    var sucesso = new SavedRequestAwareAuthenticationSuccessHandler();
    sucesso.setDefaultTargetUrl("/map.html");
    var cache = new org.springframework.security.web.savedrequest.HttpSessionRequestCache();
    cache.setRequestMatcher(
        req -> req.getMethod().equals("GET") && req.getRequestURI().equals("/favoritos.html"));
    http.requestCache(c -> c.requestCache(cache))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers("/admin", "/admin/**", "/api/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/favoritos.html", "/api/me", "/api/me/**")
                    .hasRole("USER")
                    .requestMatchers(
                        "/",
                        "/index.html",
                        "/map.html",
                        "/testemap.html",
                        "/catalo.html",
                        "/forma.html",
                        "/entra.html",
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
