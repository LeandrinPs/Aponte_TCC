package com.aponte.Controller;

import com.aponte.DTO.*;
import com.aponte.Service.*;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdministradorController {
  private final AdministradorService admin;
  private final UsuarioService usuariosService;
  private final EstabelecimentosService estabelecimentos;
  private final CardapioService cardapios;

  @GetMapping("/resumo")
  public PainelResumoDTO resumo() {
    return admin.resumo();
  }

  @GetMapping("/usuarios")
  public List<UsuarioDTO> usuarios() {
    return admin.listarUsuarios();
  }

  @GetMapping("/usuarios/{id}")
  public UsuarioDTO usuario(@PathVariable Long id) {
    return admin.buscarUsuario(id);
  }

  @PutMapping("/usuarios/{id}")
  public UsuarioDTO atualizarUsuario(
      @PathVariable Long id, @Valid @RequestBody UsuarioAtualizacaoDTO dados) {
    return admin.atualizarUsuario(id, dados);
  }

  @GetMapping("/usuarios/{id}/exclusao")
  public EstadoExclusaoDTO verificarUsuario(@PathVariable Long id) {
    return usuariosService.verificarExclusao(id);
  }

  @GetMapping("/estabelecimentos/{id}/exclusao")
  public EstadoExclusaoDTO verificarEstabelecimento(@PathVariable Long id) {
    return estabelecimentos.verificarExclusao(id);
  }

  @DeleteMapping("/usuarios/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void excluirUsuario(@PathVariable Long id) {
    admin.excluirUsuario(id);
  }

  @GetMapping("/estabelecimentos")
  public List<EstabelecimentoDTO> estabelecimentos() {
    return admin.listarEstabelecimentos();
  }

  @GetMapping("/estabelecimentos/{id}")
  public EstabelecimentoDTO estabelecimento(@PathVariable Long id) {
    return admin.buscarEstabelecimento(id);
  }

  @PostMapping("/estabelecimentos")
  @ResponseStatus(HttpStatus.CREATED)
  public EstabelecimentoDTO cadastrar(@Valid @RequestBody DadosEstabelecimentoDTO dados) {
    return admin.cadastrarEstabelecimento(dados);
  }

  @PutMapping("/estabelecimentos/{id}")
  public EstabelecimentoDTO atualizar(
      @PathVariable Long id, @Valid @RequestBody DadosEstabelecimentoDTO dados) {
    return admin.atualizarEstabelecimento(id, dados);
  }

  @DeleteMapping("/estabelecimentos/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void excluir(@PathVariable Long id) {
    admin.excluirEstabelecimento(id);
  }

  @PostMapping(value = "/estabelecimentos/{id}/foto", consumes = "multipart/form-data")
  public EstabelecimentoDTO foto(@PathVariable Long id, @RequestParam MultipartFile arquivo) {
    return estabelecimentos.definirFoto(id, arquivo);
  }

  @DeleteMapping("/estabelecimentos/{id}/foto")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removerFoto(@PathVariable Long id) {
    estabelecimentos.removerFoto(id);
  }

  @PostMapping(value = "/estabelecimentos/{id}/fotos/{posicao}", consumes = "multipart/form-data")
  public EstabelecimentoDTO fotoPosicao(
      @PathVariable Long id, @PathVariable int posicao, @RequestParam MultipartFile arquivo) {
    return estabelecimentos.definirFoto(id, posicao, arquivo);
  }

  @DeleteMapping("/estabelecimentos/{id}/fotos/{posicao}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removerFotoPosicao(@PathVariable Long id, @PathVariable int posicao) {
    estabelecimentos.removerFoto(id, posicao);
  }

  @DeleteMapping("/estabelecimentos/{id}/fotos")
  public EstabelecimentoDTO removerTodasFotos(@PathVariable Long id) {
    return estabelecimentos.removerTodasFotos(id);
  }

  @PutMapping("/estabelecimentos/{id}/fotos/{posicao}/principal")
  public EstabelecimentoDTO principal(@PathVariable Long id, @PathVariable int posicao) {
    return estabelecimentos.tornarPrincipal(id, posicao);
  }

  @PostMapping("/cardapios")
  @ResponseStatus(HttpStatus.CREATED)
  public CardapioDTO cadastrarItem(@Valid @RequestBody CardapioRequisicaoDTO body) {
    return cardapios.cadastrar(body.referencia(), body.dados());
  }

  @PutMapping("/cardapios/{id}")
  public CardapioDTO atualizarItem(
      @PathVariable Long id, @Valid @RequestBody CardapioDadosDTO dados) {
    return cardapios.atualizar(id, dados);
  }

  @DeleteMapping("/cardapios/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void excluirItem(@PathVariable Long id) {
    cardapios.excluir(id);
  }

  @DeleteMapping("/avaliacoes/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void moderar(@PathVariable Long id) {
    admin.removerAvaliacao(id);
  }
}
