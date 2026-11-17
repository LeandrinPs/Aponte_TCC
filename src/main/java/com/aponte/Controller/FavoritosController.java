package com.aponte.Controller;

import com.aponte.DTO.*;
import com.aponte.Service.FavoritosService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/me/favoritos")
@RequiredArgsConstructor
public class FavoritosController {
  private final FavoritosService service;

  @GetMapping
  public List<FavoritoDTO> listar() {
    return service.listarMeus();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public FavoritoDTO adicionar(@Valid @RequestBody ReferenciaEstabelecimentoDTO ref) {
    return service.adicionar(ref);
  }

  @GetMapping("/existe")
  public boolean existe(
      @RequestParam(required = false) Long id,
      @RequestParam(required = false) String googlePlaceId) {
    return service.existe(new ReferenciaEstabelecimentoDTO(id, googlePlaceId));
  }

  @DeleteMapping
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remover(
      @RequestParam(required = false) Long id,
      @RequestParam(required = false) String googlePlaceId) {
    service.remover(new ReferenciaEstabelecimentoDTO(id, googlePlaceId));
  }
}
