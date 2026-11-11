package com.aponte.DTO;

import jakarta.validation.constraints.*;

public record UsuarioAtualizacaoDTO(
    @NotBlank @Size(max = 50) String nome, @NotBlank @Email @Size(max = 50) String email) {}
