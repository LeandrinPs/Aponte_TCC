package com.aponte.DTO;

import jakarta.validation.constraints.*;

/** Informe exatamente um identificador. O Place ID é opaco e sensível a maiúsculas. */
public record ReferenciaEstabelecimentoDTO(
    @Positive Long id, @Size(min = 1, max = 255) @Pattern(regexp = "\\S+") String googlePlaceId) {
  @AssertTrue(message = "Informe somente o ID interno ou o Google Place ID")
  public boolean isIdentificadorValido() {
    return (id != null) != (googlePlaceId != null);
  }

  public static ReferenciaEstabelecimentoDTO porId(Long id) {
    return new ReferenciaEstabelecimentoDTO(id, null);
  }

  public static ReferenciaEstabelecimentoDTO google(String placeId) {
    return new ReferenciaEstabelecimentoDTO(null, placeId);
  }
}
