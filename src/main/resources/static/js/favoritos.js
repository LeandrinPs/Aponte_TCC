"use strict";
let atualizandoFavoritos = false;
async function atualizarFotosFavoritos() {
  if (atualizandoFavoritos) return;
  atualizandoFavoritos = true;
  for (const card of document.querySelectorAll("[data-google-place-id]")) {
    if (!window.google?.maps?.importLibrary) break;
    try {
      const p = await Aponte.place(card.dataset.googlePlaceId, [
        "displayName",
        "formattedAddress",
        "photos",
        "types",
        "primaryType",
      ]);
      card.querySelector("h2").textContent =
        p.displayName || "Estabelecimento Google";
      card.querySelector(".endereco").textContent = p.formattedAddress || "";
      Aponte.fotoGoogle(
        p,
        card.querySelector("img"),
        card.querySelector(".creditos"),
      );
    } catch {
      card.querySelector(".endereco").textContent =
        "Detalhes do Google indisponíveis. Você ainda pode consultar o favorito no mapa.";
    }
  }
  atualizandoFavoritos = false;
}
window.atualizarFotosFavoritos = atualizarFotosFavoritos;
async function carregarFavoritos() {
  const lista = document.getElementById("lista-favoritos");
  Aponte.skeleton(lista);
  try {
    const itens = await Aponte.api("/api/me/favoritos");
    lista.replaceChildren();
    document.dispatchEvent(
      new CustomEvent("favoritos-carregados", { detail: itens.length }),
    );
    document.getElementById("favoritos-status").textContent = itens.length
      ? `${itens.length} estabelecimento(s) favorito(s)`
      : "Você ainda não tem favoritos. Escolha um estabelecimento no mapa.";
    for (const f of itens) {
      const e = f.estabelecimento;
      const col = Aponte.el("div", "col-md-4");
      const card = Aponte.el("article", "card h-100");
      if (e.googlePlaceId) card.dataset.googlePlaceId = e.googlePlaceId;
      const img = Aponte.el("img", "card-img-top foto-card");
      img.alt = "Fotografia do estabelecimento";
      const body = Aponte.el("div", "card-body");
      const titulo = Aponte.el(
        "h2",
        "h5",
        e.dadosProprios?.nome || "Estabelecimento Google",
      );
      const end = Aponte.el(
        "p",
        "endereco",
        e.dadosProprios
          ? Aponte.endereco(e.dadosProprios)
          : "Carregue os detalhes no mapa",
      );
      const creditos = Aponte.el("div", "creditos small");
      Aponte.fotoPropria(e, img, creditos);
      const link = Aponte.el("a", "btn btn-outline-danger me-2", "Ver no mapa");
      link.href = Aponte.linkMapa(e);
      const remover = Aponte.el(
        "button",
        "btn btn-outline-secondary",
        "Remover favorito",
      );
      remover.onclick = async () => {
        remover.disabled = true;
        try {
          await Aponte.api(
            "/api/me/favoritos?" + Aponte.consulta(Aponte.referencia(e)),
            { method: "DELETE" },
          );
          await carregarFavoritos();
        } catch (err) {
          Aponte.aviso(err.message, true, "favoritos-status");
          remover.disabled = false;
        }
      };
      body.append(titulo, end, creditos, link, remover);
      card.append(img, body);
      col.append(card);
      lista.append(col);
    }
    await atualizarFotosFavoritos();
  } catch (e) {
    lista.replaceChildren();
    Aponte.aviso(e.message, true, "favoritos-status");
  } finally {
    Aponte.pronto(lista);
  }
}
carregarFavoritos();
