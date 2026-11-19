package com.aponte.DTO;

import jakarta.validation.constraints.*;

public record UsuarioCadastroDTO(
    @NotBlank @Size(max = 50) String nome,
    @NotBlank @Email @Size(max = 50) String email,
    @com.fasterxml.jackson.annotation.JsonProperty(
            access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
        @NotBlank
        @Size(min = 8, max = 72)
        String senha,
    @com.fasterxml.jackson.annotation.JsonProperty(
            access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
        @NotBlank
        String confirmacaoSenha) {
  public UsuarioCadastroDTO(String nome, String email, String senha) {
    this(nome, email, senha, senha);
  }

  @AssertTrue(message = "As senhas devem ser iguais")
  @com.fasterxml.jackson.annotation.JsonIgnore
  public boolean isConfirmacaoValida() {
    return senha != null && senha.equals(confirmacaoSenha);
  }

  @Override
  public String toString() {
    return "UsuarioCadastroDTO[senha=<protegida>]";
  }
}
