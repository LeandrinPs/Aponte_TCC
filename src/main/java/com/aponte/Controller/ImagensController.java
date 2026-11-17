package com.aponte.Controller;

import com.aponte.Service.ImagensService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ImagensController {
  private final ImagensService imagens;

  @GetMapping("/imagens/{nome}")
  public ResponseEntity<Resource> carregar(@PathVariable String nome) {
    var recurso = imagens.carregar(nome);
    return ResponseEntity.ok()
        .header("X-Content-Type-Options", "nosniff")
        .contentType(nome.endsWith(".png") ? MediaType.IMAGE_PNG : MediaType.IMAGE_JPEG)
        .body(recurso);
  }
}
