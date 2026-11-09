package com.aponte.DTO;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CardapioDadosDTO(
    @NotBlank @Size(max = 50) String nome,
    @NotBlank @Size(max = 500) String descricao,
    @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal preco) {}
