package com.aponte.DTO;

import com.aponte.Entity.Favoritos;

public record FavoritoDTO(Long id, Long usuarioId, EstabelecimentoDTO estabelecimento) {
  public static FavoritoDTO de(Favoritos favorito) {
    return new FavoritoDTO(
        favorito.getId(),
        favorito.getUsuario().getId(),
        EstabelecimentoDTO.de(favorito.getEstabelecimento()));
  }
}
