package com.aponte.Security;

import com.aponte.Exception.RecursoNaoEncontradoException;
import com.aponte.Repository.AdministradorRepository;
import com.aponte.Repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AcessoAtual {
  private final UsuarioRepository usuarios;
  private final AdministradorRepository administradores;

  public PrincipalAponte exigirAutenticado() {
    var autenticacao = SecurityContextHolder.getContext().getAuthentication();
    if (autenticacao == null || !autenticacao.isAuthenticated()) {
      throw new AuthenticationCredentialsNotFoundException("Autenticação necessária");
    }
    if (!(autenticacao.getPrincipal() instanceof PrincipalAponte principal)) {
      // OAuth2 só poderá operar após associação explícita e verificada com uma conta local.
      throw new AccessDeniedException("Identidade não associada a uma conta do Aponte");
    }
    String papel = principal.isAdministrador() ? "ROLE_ADMIN" : "ROLE_USER";
    if (autenticacao.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals(papel))) {
      throw new AccessDeniedException("Permissão insuficiente");
    }
    boolean existe =
        principal.isAdministrador()
            ? administradores.existsById(principal.getId())
            : usuarios.existsById(principal.getId());
    if (!existe) throw new RecursoNaoEncontradoException("Conta autenticada não encontrada");
    return principal;
  }

  public Long usuarioId() {
    PrincipalAponte principal = exigirAutenticado();
    if (principal.isAdministrador()) {
      throw new AccessDeniedException("Esta operação exige uma conta de usuário");
    }
    return principal.getId();
  }

  public void exigirAdministrador() {
    if (!exigirAutenticado().isAdministrador()) {
      throw new AccessDeniedException("Operação exclusiva de administradores");
    }
  }

  public void exigirProprioOuAdministrador(Long usuarioId) {
    PrincipalAponte principal = exigirAutenticado();
    if (!principal.isAdministrador() && !principal.getId().equals(usuarioId)) {
      throw new AccessDeniedException("Não é permitido acessar outro usuário");
    }
  }
}
