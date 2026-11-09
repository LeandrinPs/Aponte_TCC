package com.aponte.DTO;

import com.aponte.Entity.Avaliacao;

public record AvaliacaoDTO(
    Long id, Long usuarioId, EstabelecimentoDTO estabelecimento, Integer nota, String comentario) {
  public static AvaliacaoDTO de(Avaliacao avaliacao) {
    return new AvaliacaoDTO(
        avaliacao.getId(),
        avaliacao.getUsuario().getId(),
        EstabelecimentoDTO.de(avaliacao.getEstabelecimento()),
        avaliacao.getNota(),
        avaliacao.getComentario());
  }
}
