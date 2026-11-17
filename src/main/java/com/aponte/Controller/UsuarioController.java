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

  public record Sessao(boolean autenticado, boolean administrador, Long usuarioId, String nome) {}

  @GetMapping("/sessao")
  public Sessao sessao(Authentication auth) {
    if (auth == null || !(auth.getPrincipal() instanceof PrincipalAponte p))
      return new Sessao(false, false, null, null);
    if (p.isAdministrador()) return new Sessao(true, true, null, p.getUsername().substring(6));
    var perfil = usuarios.buscarMeuPerfil();
    return new Sessao(true, false, perfil.id(), perfil.nome());
  }

  public record TokenCsrf(String token, String headerName) {}

  @GetMapping("/csrf")
  public TokenCsrf csrf(CsrfToken csrf) {
    return new TokenCsrf(csrf.getToken(), csrf.getHeaderName());
  }
}
