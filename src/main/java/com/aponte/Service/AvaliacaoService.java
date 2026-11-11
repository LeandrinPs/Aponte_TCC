package com.aponte.Service;

import com.aponte.DTO.*;
import com.aponte.Entity.Avaliacao;
import com.aponte.Exception.*;
import com.aponte.Repository.*;
import com.aponte.Security.AcessoAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AvaliacaoService {
  private final AvaliacaoRepository avaliacoes;
  private final UsuarioRepository usuarios;
  private final EstabelecimentosService estabelecimentos;
  private final AcessoAtual acesso;

  @Transactional
  public AvaliacaoDTO registrar(
      @NotNull @Valid ReferenciaEstabelecimentoDTO referencia,
      @NotNull @Valid AvaliacaoDadosDTO dados) {
    Long usuarioId = acesso.usuarioId();
    var usuario =
        usuarios
            .findById(usuarioId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado"));
    var estabelecimento = estabelecimentos.referenciaParaAssociacao(referencia);
    if (avaliacoes.existsByUsuario_IdAndEstabelecimento_Id(usuarioId, estabelecimento.getId())) {
      throw new ConflitoException(
          "Usuário já avaliou este estabelecimento; edite a avaliação existente");
    }
    Avaliacao avaliacao = new Avaliacao();
    avaliacao.setUsuario(usuario);
    avaliacao.setEstabelecimento(estabelecimento);
    aplicar(avaliacao, dados);
    return AvaliacaoDTO.de(Persistencia.gravar(() -> avaliacoes.saveAndFlush(avaliacao)));
  }

  public List<AvaliacaoDTO> listarPorEstabelecimento(
      @NotNull @Valid ReferenciaEstabelecimentoDTO referencia) {
    return estabelecimentos
        .referenciaExistente(referencia)
        .map(
            e ->
                avaliacoes.findByEstabelecimento_Id(e.getId()).stream()
                    .map(AvaliacaoDTO::de)
                    .toList())
        .orElseGet(List::of);
  }

  public List<AvaliacaoDTO> listarMinhas() {
    return avaliacoes.findByUsuario_Id(acesso.usuarioId()).stream().map(AvaliacaoDTO::de).toList();
  }

  public List<AvaliacaoDTO> listarPorUsuario(@NotNull @Positive Long usuarioId) {
    acesso.exigirProprioOuAdministrador(usuarioId);
    if (!usuarios.existsById(usuarioId))
      throw new RecursoNaoEncontradoException("Usuário não encontrado");
    return avaliacoes.findByUsuario_Id(usuarioId).stream().map(AvaliacaoDTO::de).toList();
  }

  public ResumoAvaliacoesDTO resumir(@NotNull @Valid ReferenciaEstabelecimentoDTO referencia) {
    return estabelecimentos
        .referenciaExistente(referencia)
        .map(
            e ->
                new ResumoAvaliacoesDTO(
                    avaliacoes.countByEstabelecimento_Id(e.getId()),
                    avaliacoes.calcularMediaPorEstabelecimento(e.getId())))
        .orElseGet(() -> new ResumoAvaliacoesDTO(0, null));
  }

  public Double calcularMedia(@NotNull @Valid ReferenciaEstabelecimentoDTO referencia) {
    return resumir(referencia).media();
  }

  public long contar(@NotNull @Valid ReferenciaEstabelecimentoDTO referencia) {
    return resumir(referencia).quantidade();
  }

  @Transactional
  public AvaliacaoDTO editarMinha(
      @NotNull @Positive Long id, @NotNull @Valid AvaliacaoDadosDTO dados) {
    var avaliacao = exigirPropria(id);
    aplicar(avaliacao, dados);
    return AvaliacaoDTO.de(Persistencia.gravar(() -> avaliacoes.saveAndFlush(avaliacao)));
  }

  @Transactional
  public void excluirMinha(@NotNull @Positive Long id) {
    excluir(exigirPropria(id));
  }

  @Transactional
  public void excluirComoAdministrador(@NotNull @Positive Long id) {
    acesso.exigirAdministrador();
    excluir(exigirExistente(id));
  }

  private Avaliacao exigirPropria(Long id) {
    Long usuarioId = acesso.usuarioId();
    var avaliacao = exigirExistente(id);
    if (!avaliacao.getUsuario().getId().equals(usuarioId)) {
      throw new AccessDeniedException("Somente o autor pode alterar ou excluir esta avaliação");
    }
    return avaliacao;
  }

  private Avaliacao exigirExistente(Long id) {
    return avaliacoes
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Avaliação não encontrada"));
  }

  private void excluir(Avaliacao avaliacao) {
    Persistencia.executar(
        () -> {
          avaliacoes.delete(avaliacao);
          avaliacoes.flush();
        });
  }

  private static void aplicar(Avaliacao avaliacao, AvaliacaoDadosDTO dados) {
    avaliacao.setNota(dados.nota());
    avaliacao.setComentario(
        dados.comentario() == null || dados.comentario().isBlank()
            ? null
            : dados.comentario().strip());
  }
}
