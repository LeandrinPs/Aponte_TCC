package com.aponte.Controller;

import com.aponte.DTO.*;
import com.aponte.Service.EstabelecimentosService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estabelecimentos")
@RequiredArgsConstructor
public class EstabelecimentosController {
  private final EstabelecimentosService service;

  @GetMapping
  public List<EstabelecimentoDTO> listar() {
    return service.listarProprios();
  }

  @GetMapping("/avaliacoes")
  public List<ResumoEstabelecimentoDTO> resumos() {
    return service.resumosProprios();
  }

  @GetMapping("/{id}")
  public EstabelecimentoDTO buscar(@PathVariable Long id) {
    return service.buscarPorId(id);
  }

  @GetMapping("/google")
  public EstabelecimentoDTO google(@RequestParam String googlePlaceId) {
    return service.buscarPorGooglePlaceId(googlePlaceId);
  }
}
