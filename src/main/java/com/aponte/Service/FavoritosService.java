package com.aponte.Service;

import com.aponte.DTO.*;
import com.aponte.Entity.Favoritos;
import com.aponte.Exception.*;
import com.aponte.Repository.*;
import com.aponte.Security.AcessoAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FavoritosService {
  private final FavoritosRepository favoritos;
  private final UsuarioRepository usuarios;
  private final EstabelecimentosService estabelecimentos;
  private final AcessoAtual acesso;

  @Transactional
  public FavoritoDTO adicionar(@NotNull @Valid ReferenciaEstabelecimentoDTO referencia) {
    Long usuarioId = acesso.usuarioId();
    var usuario =
        usuarios
            .findById(usuarioId)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado"));
    var estabelecimento = estabelecimentos.referenciaParaAssociacao(referencia);
    if (favoritos.existsByUsuario_IdAndEstabelecimento_Id(usuarioId, estabelecimento.getId())) {
      throw new ConflitoException("Estabelecimento já favoritado pelo usuário");
    }
    Favoritos favorito = new Favoritos();
    favorito.setUsuario(usuario);
    favorito.setEstabelecimento(estabelecimento);
    return FavoritoDTO.de(Persistencia.gravar(() -> favoritos.saveAndFlush(favorito)));
  }

  @Transactional
  public void remover(@NotNull @Valid ReferenciaEstabelecimentoDTO referencia) {
    Long usuarioId = acesso.usuarioId();
    var estabelecimento =
        estabelecimentos
            .referenciaExistente(referencia)
            .orElseThrow(() -> new RecursoNaoEncontradoException("Favorito não encontrado"));
    var favorito =
        favoritos
            .findByUsuario_IdAndEstabelecimento_Id(usuarioId, estabelecimento.getId())
            .orElseThrow(() -> new RecursoNaoEncontradoException("Favorito não encontrado"));
    Persistencia.executar(
        () -> {
          favoritos.delete(favorito);
          favoritos.flush();
        });
  }

  public List<FavoritoDTO> listarMeus() {
    return favoritos.findByUsuario_Id(acesso.usuarioId()).stream().map(FavoritoDTO::de).toList();
  }

  public boolean existe(@NotNull @Valid ReferenciaEstabelecimentoDTO referencia) {
    Long usuarioId = acesso.usuarioId();
    return estabelecimentos
        .referenciaExistente(referencia)
        .map(e -> favoritos.existsByUsuario_IdAndEstabelecimento_Id(usuarioId, e.getId()))
        .orElse(false);
  }
}
