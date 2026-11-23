"use strict";
window.Aponte = (() => {
  let csrf;
  const el = (tag, classe, texto) => {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (tag === "i" && classe?.includes("bi"))
      n.setAttribute("aria-hidden", "true");
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
  function creditosGoogle(creditos, foto) {
    creditos.replaceChildren();
    const marca = el("img", "google-atribuicao");
    marca.src = "/img/google-maps-atribuicao.svg";
    marca.alt = "Google Maps";
    creditos.append(marca);
    for (const autor of foto?.authorAttributions || []) {
      let n = el("span", "", autor.displayName || "");
      try {
        const u = new URL(autor.uri);
        if (u.protocol === "https:") {
          n = el("a", "", autor.displayName);
          n.href = u.href;
          n.target = "_blank";
          n.rel = "noopener noreferrer";
        }
      } catch {}
      creditos.append(n, " ");
    }
  }
  function fotoGoogle(place, img, creditos) {
    const foto = place.photos?.[0];
    creditosGoogle(creditos, foto);
    try {
      imagem(
        img,
        foto ? foto.getURI({ maxWidth: 1000, maxHeight: 700 }) : null,
      );
    } catch {
      imagem(img, null);
    }
  }
  function galeria(alvo, itens, googleOrigem = false) {
    let indice = 0;
    const fotos = (itens || []).filter(Boolean).slice(0, 3);
    const img = alvo.querySelector("img.foto-galeria"),
      creditos = alvo.querySelector(".creditos");
    const anterior = alvo.querySelector("[data-anterior]"),
      proxima = alvo.querySelector("[data-proxima]"),
      contador = alvo.querySelector("[data-contador]");
    function render() {
      const f = fotos[indice];
      if (googleOrigem) creditosGoogle(creditos, f);
      else {
        creditos.replaceChildren();
        if (f)
          creditos.append(el("span", "", "Fotografia fornecida ao Aponte"));
      }
      let url = null;
      try {
        url = googleOrigem ? f?.getURI({ maxWidth: 1000, maxHeight: 700 }) : f;
      } catch {}
      imagem(img, url);
      img.onerror = () => {
        img.onerror = null;
        img.src = "/img/imagem.jpeg";
        creditos.append(
          el("span", "foto-falha", " Fotografia indisponível no momento."),
        );
      };
      img.alt = f
        ? `Fotografia ${indice + 1} do estabelecimento`
        : "Fotografia ilustrativa — estabelecimento sem imagem disponível";
      if (contador) {
        contador.textContent = `${indice + 1} / ${fotos.length}`;
        contador.hidden = fotos.length < 2;
      }
      anterior.hidden = proxima.hidden = fotos.length < 2;
    }
    anterior.onclick = () => {
      indice = (indice - 1 + fotos.length) % fotos.length;
      render();
    };
    proxima.onclick = () => {
      indice = (indice + 1) % fotos.length;
      render();
    };
    render();
  }
  const categorias = {
    restaurantes: {
      nome: "Restaurante",
      icone: "🍽️",
      tipos: ["restaurant"],
    },
    pizzarias: {
      nome: "Pizzaria",
      icone: "🍕",
      tipos: ["pizza_restaurant"],
    },
    hamburguerias: {
      nome: "Hamburgueria",
      icone: "🍔",
      tipos: ["hamburger_restaurant"],
    },
    cafeterias: {
      nome: "Cafeteria",
      icone: "☕",
      tipos: ["cafe", "coffee_shop"],
    },
    japoneses: {
      nome: "Restaurante japonês",
      icone: "🍣",
      tipos: ["japanese_restaurant", "sushi_restaurant"],
    },
    churrascarias: {
      nome: "Churrascaria",
      icone: "🥩",
      tipos: ["barbecue_restaurant", "steak_house"],
    },
    brasileira: {
      nome: "Comida brasileira",
      icone: "🍛",
      tipos: ["brazilian_restaurant"],
    },
    italiana: {
      nome: "Italiana",
      icone: "🍝",
      tipos: ["italian_restaurant"],
    },
    mexicana: {
      nome: "Mexicana",
      icone: "🌮",
      tipos: ["mexican_restaurant"],
    },
    chinesa: {
      nome: "Chinesa",
      icone: "🥡",
      tipos: ["chinese_restaurant"],
    },
    vegetariana: {
      nome: "Vegetariana",
      icone: "🥗",
      tipos: ["vegetarian_restaurant"],
    },
    "frutos-do-mar": {
      nome: "Frutos do mar",
      icone: "🦐",
      tipos: ["seafood_restaurant"],
    },
    docerias: {
      nome: "Doceria",
      icone: "🍰",
      tipos: [
        "dessert_shop",
        "dessert_restaurant",
        "confectionery",
        "candy_store",
        "chocolate_shop",
        "ice_cream_shop",
        "pastry_shop",
        "cake_shop",
        "donut_shop",
      ],
    },
  };
  const tipos = Object.fromEntries(
    Object.entries(categorias).flatMap(([chave, d]) =>
      d.tipos.map((t) => [t, chave]),
    ),
  );
  function pin(simbolo, origem = "google") {
    const n = el(
      "div",
      "icone-comida " + (origem === "aponte" ? "proprio" : "google"),
    );
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 44 54");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute(
      "d",
      "M22 53C17 44 2 35 2 22A20 20 0 1 1 42 22C42 35 27 44 22 53Z",
    );
    path.setAttribute("fill", "currentColor");
    path.setAttribute("stroke", "white");
    path.setAttribute("stroke-width", "2");
    const centro = document.createElementNS(svg.namespaceURI, "circle");
    centro.setAttribute("cx", "22");
    centro.setAttribute("cy", "22");
    centro.setAttribute("r", "14");
    centro.setAttribute("fill", "white");
    svg.append(path, centro);
    const texto = el("span", "simbolo-marcador", simbolo);
    texto.setAttribute("aria-hidden", "true");
    n.append(svg, texto);
    return n;
  }
  function classificar(place) {
    const chave =
      (tipos[place.primaryType] !== "restaurantes" &&
        tipos[place.primaryType]) ||
      (place.types || [])
        .map((t) => tipos[t])
        .find((t) => t && t !== "restaurantes") ||
      "restaurantes";
    const conhecido = categorias[chave];
    return {
      ...conhecido,
      chave,
      nome:
        chave !== "restaurantes"
          ? conhecido.nome
          : place.primaryTypeDisplayName || conhecido.nome,
    };
  }
  function iconeProprio(d) {
    return (
      categorias[d.icone && d.icone !== "auto" ? d.icone : d.categoria] ||
      categorias.restaurantes
    ).icone;
  }
  function correspondeFiltro(d, chave) {
    return (
      !categorias[chave] ||
      chave === "restaurantes" ||
      d.categoria === chave ||
      d.tags?.includes(chave)
    );
  }
  function skeleton(container, quantidade = 3) {
    container.setAttribute("aria-busy", "true");
    container.replaceChildren();
    for (let i = 0; i < quantidade; i++) {
      const c = el("div", "col-md-4");
      const box = el("div", "skeleton-card");
      box.setAttribute("aria-hidden", "true");
      box.append(
        el("div", "skeleton curto"),
        el("div", "skeleton foto"),
        el("div", "skeleton"),
      );
      c.append(box);
      container.append(c);
    }
  }
  function pronto(container) {
    container.setAttribute("aria-busy", "false");
  }
  function ocupado(botao, ativo, texto = "Aguarde…") {
    if (ativo) {
      botao.dataset.textoOriginal = botao.innerHTML;
      botao.disabled = true;
      const sp = el("span", "spinner-border");
      sp.setAttribute("aria-hidden", "true");
      botao.replaceChildren(sp, " ", document.createTextNode(texto));
      botao.setAttribute("aria-busy", "true");
    } else {
      botao.innerHTML = botao.dataset.textoOriginal || botao.innerHTML;
      botao.disabled = false;
      botao.removeAttribute("aria-busy");
    }
  }
  async function place(id, campos) {
    if (!window.google?.maps?.importLibrary)
      throw new Error("Detalhes do Google indisponíveis neste momento");
    const { Place } = await google.maps.importLibrary("places");
    const p = new Place({ id });
    await p.fetchFields({
      fields: campos || [
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
        "primaryType",
        "primaryTypeDisplayName",
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
      n.replaceChildren();
      const dropdown = el("div", "dropdown");
      const b = el("button", "conta-toggle dropdown-toggle");
      b.type = "button";
      b.dataset.bsToggle = "dropdown";
      b.setAttribute("aria-expanded", "false");
      b.setAttribute("aria-label", "Menu da conta");
      const avatar = el("img", "avatar-nav");
      avatar.src = s.fotoUrl || "/img/avatar.svg";
      avatar.alt = "";
      b.append(avatar, el("span", "conta-nome", s.nome));
      const menu = el("ul", "dropdown-menu dropdown-menu-end");
      for (const [texto, href, icone] of s.administrador
        ? [["Painel administrativo", "/admin", "grid"]]
        : [
            ["Meu perfil", "/perfil.html", "person-circle"],
            ["Meus favoritos", "/favoritos.html", "bookmark-heart"],
            ["Minhas avaliações", "/perfil.html#avaliacoes", "star"],
            ["Configurações", "/perfil.html#configuracoes", "gear"],
          ]) {
        const li = el("li"),
          a = el("a", "dropdown-item");
        a.href = href;
        a.append(el("i", `bi bi-${icone} me-2`), texto);
        li.append(a);
        menu.append(li);
      }
      const li = el("li"),
        form = el("form");
      form.action = "/logout";
      form.method = "post";
      const t = await token(),
        campo = el("input");
      campo.type = "hidden";
      campo.name = "_csrf";
      campo.value = t.token;
      const sair = el("button", "dropdown-item");
      sair.type = "submit";
      sair.append(el("i", "bi bi-box-arrow-right me-2"), "Sair");
      form.append(campo, sair);
      li.append(form);
      menu.append(li);
      dropdown.append(b, menu);
      n.append(dropdown);
    } catch (e) {
      aviso(e.message, true, "sessao-status");
    }
  }
  async function cardsProprios(container) {
    skeleton(container);
    const itens = await api("/api/estabelecimentos");
    pronto(container);
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
      cardsProprios(c)
        .catch((e) => aviso(e.message, true, "estabelecimentos-inicio"))
        .finally(() => pronto(c));
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
    galeria,
    categorias,
    classificar,
    pin,
    iconeProprio,
    correspondeFiltro,
    skeleton,
    pronto,
    ocupado,
    place,
    sessao,
    cardsProprios,
  };
})();
