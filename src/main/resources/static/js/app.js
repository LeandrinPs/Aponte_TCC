"use strict";
window.Aponte = (() => {
  let csrf;
  const el = (tag, classe, texto) => {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  };
  async function token() {
    if (!csrf)
      csrf = fetch("/api/csrf", { credentials: "same-origin" })
        .then(async (r) => {
          if (!r.ok) throw new Error("Não foi possível iniciar a sessão");
          return r.json();
        })
        .catch((e) => {
          csrf = null;
          throw e;
        });
    return csrf;
  }
  async function api(url, opcoes = {}) {
    const cfg = {
      credentials: "same-origin",
      ...opcoes,
      headers: { ...opcoes.headers },
    };
    if (cfg.body && !(cfg.body instanceof FormData)) {
      cfg.headers["Content-Type"] = "application/json";
      cfg.body = JSON.stringify(cfg.body);
    }
    if (!["GET", "HEAD"].includes(cfg.method || "GET")) {
      const t = await token();
      cfg.headers[t.headerName] = t.token;
    }
    const resposta = await fetch(url, cfg);
    const texto = await resposta.text();
    let dados;
    try {
      dados = texto ? JSON.parse(texto) : null;
    } catch {
      dados = null;
    }
    if (!resposta.ok) {
      const e = new Error(
        dados?.mensagem ||
          (resposta.status === 413
            ? "A fotografia deve ter até 5 MB."
            : "Não foi possível concluir a operação"),
      );
      e.status = resposta.status;
      if (e.status === 403) csrf = null;
      throw e;
    }
    return dados;
  }
  function aviso(mensagem, erro = false, alvo = "admin-status") {
    let n = document.getElementById(alvo);
    if (!n) {
      n = el("p", "container aviso-geral");
      n.id = alvo;
      n.setAttribute("role", "status");
      document.body.prepend(n);
    }
    n.textContent = mensagem;
    n.classList.toggle("mensagem-erro", erro);
    n.classList.toggle("mensagem-sucesso", !erro);
  }
  function imagem(img, url) {
    img.onerror = () => {
      img.onerror = null;
      img.src = "/img/imagem.jpeg";
    };
    img.src = url || "/img/imagem.jpeg";
  }
  function referencia(e) {
    return e.googlePlaceId ? { googlePlaceId: e.googlePlaceId } : { id: e.id };
  }
  function consulta(ref) {
    return new URLSearchParams(
      Object.entries(ref).filter(([, v]) => v != null),
    ).toString();
  }
  function endereco(d) {
    return d
      ? `${d.rua}, ${d.numero} — ${d.bairro}, ${d.cidade}/${d.estado}`
      : "";
  }
  function linkMapa(e) {
    return (
      "/map.html?" +
      new URLSearchParams(
        e.googlePlaceId ? { placeId: e.googlePlaceId } : { id: e.id },
      )
    );
  }
  function fotoGoogle(place, img, creditos) {
    creditos.replaceChildren();
    const marca = el("img", "google-atribuicao");
    marca.src = "/img/google-maps-atribuicao.svg";
    marca.alt = "Google Maps";
    creditos.append(marca, " ");
    const foto = place.photos?.[0];
    imagem(img, foto ? foto.getURI({ maxWidth: 900, maxHeight: 600 }) : null);
    for (const autor of foto?.authorAttributions || []) {
      const texto = el("span", "", autor.displayName || "");
      try {
        const u = new URL(autor.uri);
        if (u.protocol === "https:") {
          const a = el("a", "", autor.displayName);
          a.href = u.href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          creditos.append(a, " ");
          continue;
        }
      } catch {}
      creditos.append(texto, " ");
    }
  }
  async function place(id) {
    if (!window.google?.maps?.importLibrary)
      throw new Error("Detalhes do Google indisponíveis neste momento");
    const { Place } = await google.maps.importLibrary("places");
    const p = new Place({ id });
    await p.fetchFields({
      fields: [
        "displayName",
        "formattedAddress",
        "location",
        "photos",
        "nationalPhoneNumber",
        "regularOpeningHours",
        "websiteURI",
        "rating",
        "userRatingCount",
        "types",
      ],
    });
    return p;
  }
  const sessao = api("/api/sessao");
  async function navegacao() {
    try {
      const s = await sessao;
      const n = document.getElementById("sessao-nav");
      if (!n || !s.autenticado) return;
      document.querySelectorAll('a[href="/favoritos.html"]').forEach((a) => {
        a.hidden = s.administrador;
      });
      n.replaceChildren(el("span", "small", s.nome));
      if (s.administrador) {
        const a = el("a", "btn btn-outline-danger", "Painel");
        a.href = "/admin";
        n.append(a);
      }
      const form = el("form");
      form.action = "/logout";
      form.method = "post";
      const t = await token();
      const campo = el("input");
      campo.type = "hidden";
      campo.name = "_csrf";
      campo.value = t.token;
      const b = el("button", "btn btn-danger", "Sair");
      b.type = "submit";
      form.append(campo, b);
      n.append(form);
    } catch (e) {
      aviso(e.message, true, "sessao-status");
    }
  }
  async function cardsProprios(container) {
    const itens = await api("/api/estabelecimentos");
    container.replaceChildren();
    if (!itens.length) {
      container.append(
        el(
          "p",
          "",
          "Nenhum cadastro próprio disponível. Explore os estabelecimentos do Google no mapa.",
        ),
      );
      return itens;
    }
    for (const e of itens) {
      const col = el("div", "col-md-4");
      const card = el("article", "card h-100");
      const img = el("img", "card-img-top foto-card");
      img.alt = e.dadosProprios.nome;
      imagem(img, e.fotoUrl);
      const body = el("div", "card-body");
      body.append(
        el("h3", "h5", e.dadosProprios.nome),
        el("p", "", endereco(e.dadosProprios)),
      );
      const a = el("a", "btn btn-outline-danger", "Ver no mapa");
      a.href = linkMapa(e);
      body.append(a);
      card.append(img, body);
      col.append(card);
      container.append(col);
    }
    return itens;
  }
  const nav = document.querySelector(".navbar");
  if (nav)
    new ResizeObserver(() =>
      document.documentElement.style.setProperty(
        "--altura-nav",
        nav.getBoundingClientRect().height + "px",
      ),
    ).observe(nav);
  function pesquisaLocal() {
    const input = document.getElementById("pesquisa-local");
    if (input && input.value.trim())
      location.href =
        "/map.html?busca=" + encodeURIComponent(input.value.trim());
    else input?.focus();
  }
  document
    .getElementById("btn-foco-autocomplete")
    ?.addEventListener("click", pesquisaLocal);
  document
    .getElementById("pesquisa-local")
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        pesquisaLocal();
      }
    });
  document.addEventListener("DOMContentLoaded", () => {
    navegacao();
    const c = document.getElementById("estabelecimentos-inicio");
    if (c)
      cardsProprios(c).catch((e) =>
        aviso(e.message, true, "estabelecimentos-inicio"),
      );
  });
  return {
    el,
    api,
    aviso,
    imagem,
    referencia,
    consulta,
    endereco,
    linkMapa,
    fotoGoogle,
    place,
    sessao,
    cardsProprios,
  };
})();
