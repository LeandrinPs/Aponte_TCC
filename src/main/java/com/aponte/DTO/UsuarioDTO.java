package com.aponte.DTO;

import com.aponte.Entity.Usuario;

public record UsuarioDTO(Long id, String nome, String email) {
  public static UsuarioDTO de(Usuario usuario) {
    return new UsuarioDTO(usuario.getId(), usuario.getNome(), usuario.getEmail());
  }
}
