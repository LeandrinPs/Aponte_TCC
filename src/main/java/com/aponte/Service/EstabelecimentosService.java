package com.aponte.Service;

import com.aponte.DTO.*;
import com.aponte.Entity.Estabelecimentos;
import com.aponte.Exception.*;
import com.aponte.Repository.*;
import com.aponte.Security.AcessoAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EstabelecimentosService {
  private final EstabelecimentosRepository estabelecimentos;
  private final FavoritosRepository favoritos;
  private final AvaliacaoRepository avaliacoes;
  private final CardapioRepository cardapios;
  private final AcessoAtual acesso;

  public List<EstabelecimentoDTO> listar() {
    return estabelecimentos.findAll().stream().map(EstabelecimentoDTO::de).toList();
  }

  public EstabelecimentoDTO buscarPorId(@NotNull @Positive Long id) {
    return EstabelecimentoDTO.de(exigirExistente(id));
  }

  public EstabelecimentoDTO buscarPorGooglePlaceId(
      @NotBlank @Size(max = 255) @Pattern(regexp = "\\S+") String googlePlaceId) {
    return EstabelecimentoDTO.de(
        estabelecimentos
            .findByGooglePlaceId(googlePlaceId)
            .orElseThrow(
                () -> new RecursoNaoEncontradoException("Referência Google não encontrada")));
  }

  public boolean existeGooglePlaceId(
      @NotBlank @Size(max = 255) @Pattern(regexp = "\\S+") String googlePlaceId) {
    return estabelecimentos.existsByGooglePlaceId(googlePlaceId);
  }

  @Transactional
  public EstabelecimentoDTO obterOuCriarReferenciaGoogle(
      @NotBlank @Size(max = 255) @Pattern(regexp = "\\S+") String googlePlaceId) {
    acesso.exigirAutenticado();
    return EstabelecimentoDTO.de(obterOuCriarGoogle(googlePlaceId));
  }

  @Transactional
  public EstabelecimentoDTO cadastrarProprio(@NotNull @Valid DadosEstabelecimentoDTO dados) {
    acesso.exigirAdministrador();
    Estabelecimentos entidade = new Estabelecimentos();
    dados.aplicar(entidade);
    return EstabelecimentoDTO.de(
        Persistencia.gravar(() -> estabelecimentos.saveAndFlush(entidade)));
  }

  @Transactional
  public EstabelecimentoDTO atualizarProprio(
      @NotNull @Positive Long id, @NotNull @Valid DadosEstabelecimentoDTO dados) {
    acesso.exigirAdministrador();
    Estabelecimentos entidade = exigirProprio(id);
    dados.aplicar(entidade);
    return EstabelecimentoDTO.de(
        Persistencia.gravar(() -> estabelecimentos.saveAndFlush(entidade)));
  }

  @Transactional
  public void excluirProprio(@NotNull @Positive Long id) {
    acesso.exigirAdministrador();
    Estabelecimentos entidade = exigirProprio(id);
    if (favoritos.existsByEstabelecimento_Id(id)
        || avaliacoes.existsByEstabelecimento_Id(id)
        || cardapios.existsByEstabelecimento_Id(id)) {
      throw new ConflitoException(
          "Estabelecimento possui favoritos, avaliações ou itens de cardápio");
    }
    Persistencia.executar(
        () -> {
          estabelecimentos.delete(entidade);
          estabelecimentos.flush();
        });
  }

  // Acesso interno aos demais Services; não devolve entidades aos Controllers.
  Estabelecimentos referenciaParaAssociacao(ReferenciaEstabelecimentoDTO referencia) {
    return referencia.id() != null
        ? exigirExistente(referencia.id())
        : obterOuCriarGoogle(referencia.googlePlaceId());
  }

  Optional<Estabelecimentos> referenciaExistente(ReferenciaEstabelecimentoDTO referencia) {
    return referencia.id() != null
        ? Optional.of(exigirExistente(referencia.id()))
        : estabelecimentos.findByGooglePlaceId(referencia.googlePlaceId());
  }

  private Estabelecimentos obterOuCriarGoogle(String googlePlaceId) {
    return estabelecimentos
        .findByGooglePlaceId(googlePlaceId)
        .orElseGet(
            () -> {
              Estabelecimentos referencia = new Estabelecimentos();
              referencia.setGooglePlaceId(googlePlaceId);
              return Persistencia.gravar(() -> estabelecimentos.saveAndFlush(referencia));
            });
  }

  private Estabelecimentos exigirExistente(Long id) {
    return estabelecimentos
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Estabelecimento não encontrado"));
  }

  private Estabelecimentos exigirProprio(Long id) {
    Estabelecimentos entidade = exigirExistente(id);
    if (entidade.getGooglePlaceId() != null) {
      throw new ConflitoException(
          "Somente cadastros próprios do Aponte podem ser alterados ou excluídos");
    }
    return entidade;
  }
}
