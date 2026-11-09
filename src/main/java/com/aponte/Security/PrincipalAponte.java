package com.aponte.Security;

import com.aponte.Entity.Administrador;
import com.aponte.Entity.Usuario;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.User;

/** Identidade criada no servidor; IDs de Usuario e Administrador pertencem a domínios separados. */
public final class PrincipalAponte extends User {
  private final Long id;
  private final boolean administrador;

  private PrincipalAponte(Long id, String login, String hash, boolean administrador) {
    super(
        login,
        hash,
        AuthorityUtils.createAuthorityList(administrador ? "ROLE_ADMIN" : "ROLE_USER"));
    this.id = id;
    this.administrador = administrador;
  }

  public static PrincipalAponte usuario(Usuario usuario) {
    return new PrincipalAponte(usuario.getId(), usuario.getEmail(), usuario.getSenha(), false);
  }

  public static PrincipalAponte administrador(Administrador administrador) {
    return new PrincipalAponte(
        administrador.getId(),
        "admin:" + administrador.getNome(),
        administrador.getSenhahash(),
        true);
  }

  public Long getId() {
    return id;
  }

  public boolean isAdministrador() {
    return administrador;
  }

  @Override
  @JsonIgnore
  public String getPassword() {
    return super.getPassword();
  }

  @Override
  public String toString() {
    return "PrincipalAponte[id=" + id + ", administrador=" + administrador + "]";
  }
}
