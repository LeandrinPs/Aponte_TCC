package com.aponte.Service;

import com.aponte.DTO.*;
import com.aponte.Entity.Cardapio;
import com.aponte.Exception.RecursoNaoEncontradoException;
import com.aponte.Repository.CardapioRepository;
import com.aponte.Security.AcessoAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CardapioService {
  private final CardapioRepository cardapios;
  private final EstabelecimentosService estabelecimentos;
  private final AcessoAtual acesso;

  public List<CardapioDTO> listar(@NotNull @Valid ReferenciaEstabelecimentoDTO referencia) {
    return estabelecimentos
        .referenciaExistente(referencia)
        .map(
            e ->
                cardapios.findByEstabelecimento_Id(e.getId()).stream()
                    .map(CardapioDTO::de)
                    .toList())
        .orElseGet(List::of);
  }

  public CardapioDTO buscarPorId(@NotNull @Positive Long id) {
    return CardapioDTO.de(exigirExistente(id));
  }

  @Transactional
  public CardapioDTO cadastrar(
      @NotNull @Valid ReferenciaEstabelecimentoDTO referencia,
      @NotNull @Valid CardapioDadosDTO dados) {
    acesso.exigirAdministrador();
    Cardapio item = new Cardapio();
    item.setEstabelecimento(estabelecimentos.referenciaParaAssociacao(referencia));
    aplicar(item, dados);
    return CardapioDTO.de(Persistencia.gravar(() -> cardapios.saveAndFlush(item)));
  }

  @Transactional
  public CardapioDTO atualizar(@NotNull @Positive Long id, @NotNull @Valid CardapioDadosDTO dados) {
    acesso.exigirAdministrador();
    Cardapio item = exigirExistente(id);
    aplicar(item, dados);
    return CardapioDTO.de(Persistencia.gravar(() -> cardapios.saveAndFlush(item)));
  }

  @Transactional
  public void excluir(@NotNull @Positive Long id) {
    acesso.exigirAdministrador();
    Cardapio item = exigirExistente(id);
    Persistencia.executar(
        () -> {
          cardapios.delete(item);
          cardapios.flush();
        });
  }

  private Cardapio exigirExistente(Long id) {
    return cardapios
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Item de cardápio não encontrado"));
  }

  private static void aplicar(Cardapio item, CardapioDadosDTO dados) {
    item.setNome(dados.nome().strip());
    item.setDescricao(dados.descricao().strip());
    item.setPreco(dados.preco());
  }
}
