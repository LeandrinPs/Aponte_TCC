package com.aponte.DTO;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record AvaliacaoRequisicaoDTO(
    @NotNull @Valid ReferenciaEstabelecimentoDTO referencia,
    @NotNull @Valid AvaliacaoDadosDTO dados) {}
