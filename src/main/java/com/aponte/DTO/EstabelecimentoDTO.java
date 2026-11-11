package com.aponte.DTO;

import com.aponte.Entity.Estabelecimentos;

public record EstabelecimentoDTO(
    Long id, String googlePlaceId, DadosEstabelecimentoDTO dadosProprios) {
  public static EstabelecimentoDTO de(Estabelecimentos e) {
    return new EstabelecimentoDTO(
        e.getId(),
        e.getGooglePlaceId(),
        e.getGooglePlaceId() == null ? DadosEstabelecimentoDTO.de(e) : null);
  }
}
