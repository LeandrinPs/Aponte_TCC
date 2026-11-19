package com.aponte.DTO;

import jakarta.validation.constraints.*;

public record UsuarioAtualizacaoDTO(
    @NotBlank @Size(max = 50) String nome, @NotBlank @Email @Size(max = 50) String email,
    @Size(max = 100) String cidade, @Pattern(regexp = "(?:[A-Za-z]{2})?") String estado) {
  public UsuarioAtualizacaoDTO(String nome, String email) { this(nome, email, null, null); }
}
