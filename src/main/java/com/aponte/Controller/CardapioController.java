package com.aponte.Controller;

import com.aponte.DTO.*;
import com.aponte.Service.CardapioService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cardapios")
@RequiredArgsConstructor
public class CardapioController {
  private final CardapioService service;

  @GetMapping
  public List<CardapioDTO> listar(
      @RequestParam(required = false) Long id,
      @RequestParam(required = false) String googlePlaceId) {
    return service.listar(new ReferenciaEstabelecimentoDTO(id, googlePlaceId));
  }

  @GetMapping("/{id}")
  public CardapioDTO buscar(@PathVariable Long id) {
    return service.buscarPorId(id);
  }
}
