package com.aponte.DTO;

import com.aponte.Entity.Cardapio;
import java.math.BigDecimal;

public record CardapioDTO(
    Long id, EstabelecimentoDTO estabelecimento, String nome, String descricao, BigDecimal preco) {
  public static CardapioDTO de(Cardapio item) {
    return new CardapioDTO(
        item.getId(),
        EstabelecimentoDTO.de(item.getEstabelecimento()),
        item.getNome(),
        item.getDescricao(),
        item.getPreco());
  }
}
