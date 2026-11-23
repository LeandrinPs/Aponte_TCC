"use strict";
const feed = document.getElementById("avaliacoes-recentes");
let carregandoFeedGoogle = false;
window.atualizarFeedGoogle = async () => {
  if (carregandoFeedGoogle || !window.google?.maps?.importLibrary) return;
  carregandoFeedGoogle = true;
  try {
    for (const card of feed.querySelectorAll("[data-feed-place]")) {
      try {
        const p = await Aponte.place(card.dataset.feedPlace, [
          "displayName",
          "photos",
          "types",
          "primaryType",
        ]);
        card.querySelector("h3").textContent =
          p.displayName || "Estabelecimento Google";
        Aponte.fotoGoogle(
          p,
          card.querySelector(".foto-card"),
          card.querySelector(".creditos"),
        );
      } catch {
        // A ilustração e seu rótulo permanecem quando os detalhes não carregam.
        card.querySelector("h3").title =
          "Detalhes do Google indisponíveis no momento.";
      }
    }
  } finally {
    carregandoFeedGoogle = false;
  }
};
(async () => {
  Aponte.skeleton(feed);
  try {
    const itens = await Aponte.api("/api/avaliacoes/recentes");
    feed.replaceChildren();
    if (!itens.length) {
      feed.append(
        Aponte.el(
          "p",
          "vazio",
          "As primeiras experiências começam com você. Explore o mapa e avalie um lugar que conhece.",
        ),
      );
      return;
    }
    for (const a of itens) {
      const e = a.estabelecimento,
        col = Aponte.el("div", "col-md-6 col-lg-4"),
        card = Aponte.el("article", "card h-100");
      if (e.googlePlaceId) card.dataset.feedPlace = e.googlePlaceId;
      const body = Aponte.el("div", "card-body p-4"),
        autor = Aponte.el("div", "autor-avaliacao"),
        avatar = Aponte.el("img", "avatar-pequeno");
      avatar.src = a.fotoAutorUrl;
      avatar.alt = "";
      const nome = Aponte.el("div"),
        data = a.criadoEm
          ? new Date(a.criadoEm).toLocaleDateString("pt-BR")
          : "Data não registrada";
      nome.append(
        Aponte.el("strong", "", a.autor),
        Aponte.el("small", "", data),
      );
      autor.append(avatar, nome);
      body.append(
        autor,
        Aponte.el(
          "h3",
          "h5",
          e.dadosProprios?.nome || "Estabelecimento Google",
        ),
      );
      const estrelas = Aponte.el(
        "p",
        "estrelas",
        "★".repeat(a.nota) + "☆".repeat(5 - a.nota),
      );
      estrelas.setAttribute("aria-label", `${a.nota} de 5 estrelas no Aponte`);
      body.append(
        estrelas,
        Aponte.el(
          "p",
          "comentario-feed",
          a.comentario || "O usuário compartilhou sua nota.",
        ),
      );
      const img = Aponte.el("img", "foto-card w-100 rounded");
      img.alt = "Fotografia do estabelecimento";
      const creditos = Aponte.el("div", "creditos"),
        link = Aponte.el(
          "a",
          "d-inline-block mt-3 fw-semibold",
          "Ver no mapa →",
        );
      Aponte.fotoPropria(e, img, creditos);
      link.href = Aponte.linkMapa(e);
      body.append(img, creditos, link);
      card.append(body);
      col.append(card);
      feed.append(col);
    }
    await window.atualizarFeedGoogle();
  } catch (e) {
    feed.replaceChildren();
    Aponte.aviso(e.message, true, "recentes-status");
  } finally {
    Aponte.pronto(feed);
  }
})();
