package com.aponte.Controller;

import com.aponte.DTO.*;
import com.aponte.Service.AvaliacaoService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AvaliacaoController {
  private final AvaliacaoService service;

  @GetMapping("/avaliacoes/recentes")
  public List<AvaliacaoRecenteDTO> recentes() { return service.recentes(); }

  @GetMapping("/avaliacoes")
  public List<AvaliacaoDTO> listar(
      @RequestParam(required = false) Long id,
      @RequestParam(required = false) String googlePlaceId) {
    return service.listarPorEstabelecimento(new ReferenciaEstabelecimentoDTO(id, googlePlaceId));
  }

  @GetMapping("/avaliacoes/resumo")
  public ResumoAvaliacoesDTO resumo(
      @RequestParam(required = false) Long id,
      @RequestParam(required = false) String googlePlaceId) {
    return service.resumir(new ReferenciaEstabelecimentoDTO(id, googlePlaceId));
  }

  @GetMapping("/me/avaliacoes")
  public List<AvaliacaoDTO> minhas() {
    return service.listarMinhas();
  }

  @PostMapping("/me/avaliacoes")
  @ResponseStatus(HttpStatus.CREATED)
  public AvaliacaoDTO registrar(@Valid @RequestBody AvaliacaoRequisicaoDTO body) {
    return service.registrar(body.referencia(), body.dados());
  }

  @PutMapping("/me/avaliacoes/{id}")
  public AvaliacaoDTO editar(@PathVariable Long id, @Valid @RequestBody AvaliacaoDadosDTO body) {
    return service.editarMinha(id, body);
  }

  @DeleteMapping("/me/avaliacoes/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void excluir(@PathVariable Long id) {
    service.excluirMinha(id);
  }
}
