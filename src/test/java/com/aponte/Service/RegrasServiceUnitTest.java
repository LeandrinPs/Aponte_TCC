package com.aponte.Service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.aponte.DTO.*;
import com.aponte.Entity.*;
import com.aponte.Exception.*;
import com.aponte.Repository.*;
import com.aponte.Security.AcessoAtual;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.*;

class RegrasServiceUnitTest {
  @Test
  void favoritoDuplicadoNaoChegaASerSalvo() {
    var repo = mock(FavoritosRepository.class);
    var usuarios = mock(UsuarioRepository.class);
    var estabelecimentos = mock(EstabelecimentosService.class);
    var acesso = mock(AcessoAtual.class);
    var usuario = new Usuario();
    usuario.setId(1L);
    var local = new Estabelecimentos();
    local.setId(7L);
    var referencia = ReferenciaEstabelecimentoDTO.porId(7L);
    when(acesso.usuarioId()).thenReturn(1L);
    when(usuarios.findById(1L)).thenReturn(Optional.of(usuario));
    when(estabelecimentos.referenciaParaAssociacao(referencia)).thenReturn(local);
    when(repo.existsByUsuario_IdAndEstabelecimento_Id(1L, 7L)).thenReturn(true);
    var service = new FavoritosService(repo, usuarios, estabelecimentos, acesso);
    assertThatThrownBy(() -> service.adicionar(referencia)).isInstanceOf(ConflitoException.class);
    verify(repo, never()).saveAndFlush(any());
  }

  @Test
  void concorrenciaNaCriacaoGoogleNaoConsultaDentroDaTransacaoInvalida() {
    var repo = mock(EstabelecimentosRepository.class);
    var service =
        new EstabelecimentosService(
            repo,
            mock(FavoritosRepository.class),
            mock(AvaliacaoRepository.class),
            mock(CardapioRepository.class),
            mock(AcessoAtual.class));
    var causa = new DataIntegrityViolationException("detalhe SQL reservado");
    when(repo.findByGooglePlaceId("Place")).thenReturn(Optional.empty());
    when(repo.saveAndFlush(any())).thenThrow(causa);
    assertThatThrownBy(() -> service.obterOuCriarReferenciaGoogle("Place"))
        .isInstanceOf(ConflitoException.class)
        .hasCause(causa)
        .hasMessageNotContaining("SQL reservado");
    verify(repo, times(1)).findByGooglePlaceId("Place");
  }

  @Test
  void mediaEhCalculadaPeloRepositorySemCarregarListaDeAvaliacoes() {
    var repo = mock(AvaliacaoRepository.class);
    var estabelecimentos = mock(EstabelecimentosService.class);
    var local = new Estabelecimentos();
    local.setId(7L);
    var referencia = ReferenciaEstabelecimentoDTO.porId(7L);
    when(estabelecimentos.referenciaExistente(referencia)).thenReturn(Optional.of(local));
    when(repo.countByEstabelecimento_Id(7L)).thenReturn(2L);
    when(repo.calcularMediaPorEstabelecimento(7L)).thenReturn(4.0);
    var service =
        new AvaliacaoService(
            repo, mock(UsuarioRepository.class), estabelecimentos, mock(AcessoAtual.class));
    assertThat(service.resumir(referencia)).isEqualTo(new ResumoAvaliacoesDTO(2, 4.0));
    verify(repo, never()).findByEstabelecimento_Id(any());
  }

  @Test
  void falhaDePersistenciaNaoExpoeMensagemDoDriver() {
    var causa = new DataAccessResourceFailureException("jdbc:segredo erro do driver");
    assertThatThrownBy(
            () ->
                Persistencia.gravar(
                    () -> {
                      throw causa;
                    }))
        .isInstanceOf(FalhaPersistenciaException.class)
        .hasCause(causa)
        .hasMessageNotContaining("jdbc")
        .hasMessageNotContaining("segredo");
  }
}
