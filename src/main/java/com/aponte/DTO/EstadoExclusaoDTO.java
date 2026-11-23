package com.aponte.DTO;

/** Prévia administrativa; o DELETE continua validando as regras na transação definitiva. */
public record EstadoExclusaoDTO(
    boolean permitida, String mensagem, long favoritos, long avaliacoes, long itensCardapio) {}
