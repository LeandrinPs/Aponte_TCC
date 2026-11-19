package com.aponte.Controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
public class PaginasController {
  private final String mapsKey;
  private final String mapId;
  private final com.aponte.Config.GoogleOAuthConfig google;

  public PaginasController(
      @Value("${aponte.google.maps-key:}") String mapsKey,
      @Value("${aponte.google.map-id:DEMO_MAP_ID}") String mapId,
      com.aponte.Config.GoogleOAuthConfig google) {
    this.mapsKey = mapsKey;
    this.mapId = mapId;
    this.google = google;
  }

  @ModelAttribute
  public void configuracao(Model model) {
    model.addAttribute("mapsKey", mapsKey);
    model.addAttribute("mapId", mapId);
    model.addAttribute("googleOAuthHabilitado", google.habilitado());
  }

  @GetMapping("/favicon.ico")
  String icone() {
    return "redirect:/img/logo1.png";
  }

  @GetMapping({"/", "/index.html"})
  String inicio() {
    return "index";
  }

  @GetMapping("/testemap.html")
  String testeAntigo() {
    return "redirect:/map.html";
  }

  @GetMapping("/map.html")
  String mapa() {
    return "map";
  }

  @GetMapping("/forma.html")
  String cadastro() {
    return "forma";
  }

  @GetMapping("/entra.html")
  String login() {
    return "entra";
  }

  @GetMapping("/perfil.html")
  String perfil() {
    return "perfil";
  }

  @GetMapping("/favoritos.html")
  String favoritos() {
    return "favoritos";
  }

  @GetMapping("/catalo.html")
  String catalogo() {
    return "catalo";
  }

  @GetMapping("/sobre.html")
  String sobre() {
    return "sobre";
  }

  @GetMapping("/privacidade.html")
  String privacidade() {
    return "privacidade";
  }

  @GetMapping("/termos.html")
  String termos() {
    return "termos";
  }

  @GetMapping({"/admin", "/admin/"})
  String painel() {
    return "admin/index";
  }

  @GetMapping("/admin/usuarios")
  String usuarios() {
    return "admin/usuarios";
  }

  @GetMapping("/admin/estabelecimentos")
  String estabelecimentos() {
    return "admin/estabelecimentos";
  }

  @GetMapping({"/admin/avaliacoes", "/admin/cardapios"})
  String conteudos(jakarta.servlet.http.HttpServletRequest request, Model model) {
    model.addAttribute(
        "adminArea", request.getRequestURI().endsWith("avaliacoes") ? "avaliacoes" : "cardapios");
    return "admin/estabelecimentos";
  }

  @GetMapping("/admin/estabelecimentos/novo")
  String novo() {
    return "admin/formulario";
  }

  @GetMapping("/admin/estabelecimentos/{id}")
  String editar() {
    return "admin/formulario";
  }
}
