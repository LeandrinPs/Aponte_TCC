package com.aponte.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record CardapioRequisicaoDTO(
    @NotNull @Valid ReferenciaEstabelecimentoDTO referencia,
    @NotNull @Valid CardapioDadosDTO dados) {}
