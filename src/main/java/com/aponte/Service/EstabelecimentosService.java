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
import org.springframework.web.multipart.MultipartFile;

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
  private final ImagensService imagens;

  public List<EstabelecimentoDTO> listarProprios() {
    return estabelecimentos.findByGooglePlaceIdIsNull().stream()
        .map(EstabelecimentoDTO::de)
        .toList();
  }

  @Transactional
  public EstabelecimentoDTO definirFoto(
      @NotNull @Positive Long id, @NotNull MultipartFile arquivo) {
    return definirFoto(id, 1, arquivo);
  }

  @Transactional
  public EstabelecimentoDTO definirFoto(
      @NotNull @Positive Long id, @Min(1) @Max(3) int posicao, @NotNull MultipartFile arquivo) {
    acesso.exigirAdministrador();
    Estabelecimentos e = exigirProprio(id);
    String nova = imagens.salvar(arquivo);
    imagens.removerSeRollback(nova);
    String antiga = foto(e, posicao);
    foto(e, posicao, nova);
    // A primeira imagem adicionada é sempre a principal.
    if (e.getFotoPrincipal() == null) {
      foto(e, 1, nova);
      foto(e, posicao, null);
    }
    var resultado =
        EstabelecimentoDTO.de(Persistencia.gravar(() -> estabelecimentos.saveAndFlush(e)));
    imagens.removerAposConfirmacao(antiga);
    return resultado;
  }

  @Transactional
  public void removerFoto(@NotNull @Positive Long id) {
    removerFoto(id, 1);
  }

  @Transactional
  public void removerFoto(@NotNull @Positive Long id, @Min(1) @Max(3) int posicao) {
    acesso.exigirAdministrador();
    Estabelecimentos e = exigirProprio(id);
    String antiga = foto(e, posicao);
    foto(e, posicao, null);
    if (posicao == 1) {
      if (e.getFoto2() != null) {
        e.setFotoPrincipal(e.getFoto2());
        e.setFoto2(null);
      } else if (e.getFoto3() != null) {
        e.setFotoPrincipal(e.getFoto3());
        e.setFoto3(null);
      }
    }
    Persistencia.gravar(() -> estabelecimentos.saveAndFlush(e));
    imagens.removerAposConfirmacao(antiga);
  }

  @Transactional
  public EstabelecimentoDTO tornarPrincipal(
      @NotNull @Positive Long id, @Min(1) @Max(3) int posicao) {
    acesso.exigirAdministrador();
    Estabelecimentos e = exigirProprio(id);
    String nova = foto(e, posicao);
    if (nova == null) throw new IllegalArgumentException("Selecione uma posição com fotografia");
    String antiga = e.getFotoPrincipal();
    foto(e, posicao, antiga);
    e.setFotoPrincipal(nova);
    return EstabelecimentoDTO.de(Persistencia.gravar(() -> estabelecimentos.saveAndFlush(e)));
  }

  private static String foto(Estabelecimentos e, int p) {
    return switch (p) {
      case 1 -> e.getFotoPrincipal();
      case 2 -> e.getFoto2();
      case 3 -> e.getFoto3();
      default -> throw new IllegalArgumentException("Posição inválida");
    };
  }

  private static void foto(Estabelecimentos e, int p, String valor) {
    switch (p) {
      case 1 -> e.setFotoPrincipal(valor);
      case 2 -> e.setFoto2(valor);
      case 3 -> e.setFoto3(valor);
      default -> throw new IllegalArgumentException("Posição inválida");
    }
  }

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
    imagens.removerAposConfirmacao(entidade.getFotoPrincipal());
    imagens.removerAposConfirmacao(entidade.getFoto2());
    imagens.removerAposConfirmacao(entidade.getFoto3());
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
    Estabelecimentos entidade =
        estabelecimentos
            .buscarParaAtualizar(id)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Estabelecimento não encontrado"));
    if (entidade.getGooglePlaceId() != null) {
      throw new ConflitoException(
          "Somente cadastros próprios do Aponte podem ser alterados ou excluídos");
    }
    return entidade;
  }
}
