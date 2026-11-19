package com.aponte.DTO;

import com.aponte.Entity.Usuario;
import java.time.Instant;

/** Perfil privado; nunca inclui hash, sub ou tokens do provedor. */
public record UsuarioDTO(
    Long id,
    String nome,
    String email,
    String cidade,
    String estado,
    String fotoUrl,
    Instant criadoEm,
    boolean senhaLocal,
    boolean googleVinculado) {
  public static String foto(Usuario u) {
    return u.getFotoPerfil() == null ? "/img/avatar.svg" : "/imagens/" + u.getFotoPerfil();
  }

  public static UsuarioDTO de(Usuario u) {
    return new UsuarioDTO(
        u.getId(),
        u.getNome(),
        u.getEmail(),
        u.getCidade(),
        u.getEstado(),
        foto(u),
        u.getCriadoEm(),
        u.getSenha() != null,
        u.getGoogleSub() != null);
  }
}
