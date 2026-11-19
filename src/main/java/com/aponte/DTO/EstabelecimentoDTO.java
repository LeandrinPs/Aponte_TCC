package com.aponte.DTO;

import com.aponte.Entity.Estabelecimentos;

public record EstabelecimentoDTO(
    Long id, String googlePlaceId, DadosEstabelecimentoDTO dadosProprios, String fotoUrl, java.util.List<String> fotos) {
  private static String url(String nome) { return nome == null ? null : "/imagens/" + nome; }
  public static EstabelecimentoDTO de(Estabelecimentos e) {
    return new EstabelecimentoDTO(
        e.getId(),
        e.getGooglePlaceId(),
        e.getGooglePlaceId() == null ? DadosEstabelecimentoDTO.de(e) : null,
        e.getFotoPrincipal() == null ? "/img/imagem.jpeg" : "/imagens/" + e.getFotoPrincipal(),
        java.util.Arrays.asList(url(e.getFotoPrincipal()), url(e.getFoto2()), url(e.getFoto3())));
  }
}
