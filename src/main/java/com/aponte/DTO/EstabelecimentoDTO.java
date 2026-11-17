package com.aponte.DTO;

import com.aponte.Entity.Estabelecimentos;

public record EstabelecimentoDTO(
    Long id, String googlePlaceId, DadosEstabelecimentoDTO dadosProprios, String fotoUrl) {
  public static EstabelecimentoDTO de(Estabelecimentos e) {
    return new EstabelecimentoDTO(
        e.getId(),
        e.getGooglePlaceId(),
        e.getGooglePlaceId() == null ? DadosEstabelecimentoDTO.de(e) : null,
        e.getFotoPrincipal() == null ? "/img/imagem.jpeg" : "/imagens/" + e.getFotoPrincipal());
  }
}
