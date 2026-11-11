package com.aponte.DTO;

import jakarta.validation.constraints.*;

public record UsuarioCadastroDTO(
    @NotBlank @Size(max = 50) String nome,
    @NotBlank @Email @Size(max = 50) String email,
    @com.fasterxml.jackson.annotation.JsonProperty(
            access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
        @NotBlank
        @Size(min = 8, max = 72)
        String senha) {
  @Override
  public String toString() {
    return "UsuarioCadastroDTO[senha=<protegida>]";
  }
}
