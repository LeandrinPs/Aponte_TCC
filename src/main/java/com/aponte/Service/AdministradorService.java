package com.aponte.Service;

import com.aponte.DTO.*;
import com.aponte.Security.AcessoAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

/** Fachada do painel; as regras e transações permanecem nos Services responsáveis. */
@Service
@Validated
@RequiredArgsConstructor
public class AdministradorService {
  private final UsuarioService usuarios;
  private final EstabelecimentosService estabelecimentos;
  private final AvaliacaoService avaliacoes;
  private final AcessoAtual acesso;

  public List<UsuarioDTO> listarUsuarios() {
    acesso.exigirAdministrador();
    return usuarios.listar();
  }

  public UsuarioDTO buscarUsuario(@NotNull @Positive Long id) {
    acesso.exigirAdministrador();
    return usuarios.buscarPorId(id);
  }

  public UsuarioDTO atualizarUsuario(
      @NotNull @Positive Long id, @NotNull @Valid UsuarioAtualizacaoDTO dados) {
    return usuarios.atualizarComoAdministrador(id, dados);
  }

  public void excluirUsuario(@NotNull @Positive Long id) {
    usuarios.excluir(id);
  }

  public List<EstabelecimentoDTO> listarEstabelecimentos() {
    acesso.exigirAdministrador();
    return estabelecimentos.listar();
  }

  public EstabelecimentoDTO buscarEstabelecimento(@NotNull @Positive Long id) {
    acesso.exigirAdministrador();
    return estabelecimentos.buscarPorId(id);
  }

  public EstabelecimentoDTO buscarReferenciaGoogle(
      @NotBlank @Size(max = 255) @Pattern(regexp = "\\S+") String googlePlaceId) {
    acesso.exigirAdministrador();
    return estabelecimentos.buscarPorGooglePlaceId(googlePlaceId);
  }

  public EstabelecimentoDTO cadastrarEstabelecimento(
      @NotNull @Valid DadosEstabelecimentoDTO dados) {
    return estabelecimentos.cadastrarProprio(dados);
  }

  public EstabelecimentoDTO atualizarEstabelecimento(
      @NotNull @Positive Long id, @NotNull @Valid DadosEstabelecimentoDTO dados) {
    return estabelecimentos.atualizarProprio(id, dados);
  }

  public void excluirEstabelecimento(@NotNull @Positive Long id) {
    estabelecimentos.excluirProprio(id);
  }

  public void removerAvaliacao(@NotNull @Positive Long id) {
    avaliacoes.excluirComoAdministrador(id);
  }
}
