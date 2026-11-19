package com.aponte.Controller;

import com.aponte.DTO.*;
import com.aponte.Security.PrincipalAponte;
import com.aponte.Service.UsuarioService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UsuarioController {
  private final UsuarioService usuarios;
  private final com.aponte.Service.ContasGoogle google;

  @PostMapping("/usuarios")
  @ResponseStatus(HttpStatus.CREATED)
  public UsuarioDTO cadastrar(@Valid @RequestBody UsuarioCadastroDTO dados) {
    return usuarios.cadastrar(dados);
  }

  @GetMapping("/me")
  public UsuarioDTO perfil() {
    return usuarios.buscarMeuPerfil();
  }

  @PutMapping("/me")
  public UsuarioDTO atualizar(@Valid @RequestBody UsuarioAtualizacaoDTO dados) {
    return usuarios.atualizarMeuPerfil(dados);
  }

  @PostMapping(value = "/me/foto", consumes = "multipart/form-data")
  public UsuarioDTO foto(@RequestParam org.springframework.web.multipart.MultipartFile arquivo) {
    return usuarios.definirFoto(arquivo);
  }

  @DeleteMapping("/me/foto")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removerFoto() {
    usuarios.removerFoto();
  }

  public record NovaSenha(
      @com.fasterxml.jackson.annotation.JsonProperty(
              access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
          @NotBlank
          String senhaAtual,
      @com.fasterxml.jackson.annotation.JsonProperty(
              access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
          @NotBlank
          @Size(min = 8, max = 72)
          String novaSenha) {
    @Override
    public String toString() {
      return "NovaSenha[protegida]";
    }
  }

  @PutMapping("/me/senha")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void senha(@Valid @RequestBody NovaSenha dados) {
    usuarios.alterarMinhaSenha(dados.senhaAtual(), dados.novaSenha());
  }

  public record ConfirmacaoVinculo(
      @NotBlank
          @com.fasterxml.jackson.annotation.JsonProperty(
              access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
          String senhaAtual) {
    @Override
    public String toString() {
      return "ConfirmacaoVinculo[protegida]";
    }
  }

  @PostMapping("/me/google/vinculo")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void vincularGoogle(
      @Valid @RequestBody ConfirmacaoVinculo dados, jakarta.servlet.http.HttpServletRequest req) {
    google.prepararVinculo(dados.senhaAtual(), req.getSession());
  }

  public record Sessao(
      boolean autenticado, boolean administrador, Long usuarioId, String nome, String fotoUrl) {}

  @GetMapping("/sessao")
  public Sessao sessao(Authentication auth) {
    if (auth == null || !(auth.getPrincipal() instanceof PrincipalAponte p))
      return new Sessao(false, false, null, null, null);
    if (p.isAdministrador())
      return new Sessao(true, true, null, p.getUsername().substring(6), "/img/avatar.svg");
    var perfil = usuarios.buscarMeuPerfil();
    return new Sessao(true, false, perfil.id(), perfil.nome(), perfil.fotoUrl());
  }

  public record TokenCsrf(String token, String headerName) {}

  @GetMapping("/csrf")
  public TokenCsrf csrf(CsrfToken csrf) {
    return new TokenCsrf(csrf.getToken(), csrf.getHeaderName());
  }
}
