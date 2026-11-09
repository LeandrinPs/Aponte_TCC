package com.aponte.DTO;

import jakarta.validation.constraints.*;

public record AvaliacaoDadosDTO(
    @NotNull @Min(1) @Max(5) Integer nota, @Size(max = 1000) String comentario) {}
