let map;
let marcadores = [];
let marcadorUsuario = null;

let autocompleteRestaurantes = null;
let marcadorPesquisa = null;
async function initMap() {
  try {
    await propriosPromise;
    map = new google.maps.Map(document.getElementById("map"), {
      center: estadoBusca.centro,
      zoom: 15,
      mapId: document.getElementById("map-container").dataset.mapId,
      clickableIcons: true,
    });
    window.map = map;
    document.getElementById("mapa-status").textContent = "";
    document.getElementById("mapa-carregando").hidden = true;

    await configurarPlaceAutocomplete();
    await mostrarMarcadoresProprios();

    // Botão de localização
    const locationButton = document.createElement("button");
    locationButton.textContent = "Minha localização";
    locationButton.classList.add("custom-map-control-button");
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
    locationButton.addEventListener("click", obterLocalizacao);
    const pesquisar = Aponte.el(
      "button",
      "custom-map-control-button",
      "Pesquisar nesta área",
    );
    pesquisar.type = "button";
    pesquisar.addEventListener("click", () =>
      buscarRestaurantes(map.getCenter()),
    );
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(pesquisar);

    // Clique nos estabelecimentos do mapa base
    map.addListener("click", async (event) => {
      if (!event.placeId) return;
      event.stop();
      try {
        const { Place } = await google.maps.importLibrary("places");
        const restaurante = new Place({
          id: event.placeId,
        });
        await abrirPainel(restaurante);
      } catch (erro) {
        console.error("Erro ao carregar estabelecimento:", erro);
      }
    });

    const params = new URLSearchParams(location.search);
    if (params.get("placeId")) await abrirPainel({ id: params.get("placeId") });
    else if (params.get("id")) {
      const e = (await propriosPromise).find(
        (e) => String(e.id) === params.get("id"),
      );
      if (e) {
        if (selecionadoRef?.id !== e.id) await abrirProprio(e);
        else
          map.panTo({
            lat: Number(e.dadosProprios.latitude),
            lng: Number(e.dadosProprios.longitude),
          });
      } else
        Aponte.aviso("Cadastro próprio não encontrado.", true, "mapa-status");
    }
    if (params.get("placeId"))
      estadoBusca.centro =
        utilMapa.coordenadas(map.getCenter()) || estadoBusca.centro;
    await buscarRestaurantes(estadoBusca.centro);
  } catch (erro) {
    Aponte.aviso(
      "Não foi possível inicializar o mapa Google. Os cadastros próprios continuam na lista de resultados.",
      true,
      "mapa-status",
    );
    console.warn("Falha ao inicializar o mapa Google:", erro.name);
  } finally {
    document.getElementById("mapa-carregando").hidden = true;
  }
}

// GOOGLE PLACE AUTOCOMPLETE
async function configurarPlaceAutocomplete() {
  // Localiza o container HTML
  const container = document.getElementById("autocomplete-container");

  if (!container) {
    console.error("Container do Autocomplete não encontrado.");
    return;
  }

  try {
    // Importa a biblioteca Places
    const { PlaceAutocompleteElement } =
      await google.maps.importLibrary("places");

    // Cria o componente
    autocompleteRestaurantes = new PlaceAutocompleteElement({
      includedPrimaryTypes: [
        "restaurant",
        "cafe",
        "bakery",
        "bar",
        "meal_takeaway",
      ],

      includedRegionCodes: ["br"],

      requestedLanguage: "pt-BR",

      requestedRegion: "BR",

      noInputIcon: true,
    });

    // Configura o campo
    autocompleteRestaurantes.placeholder = "Pesquisar estabelecimentos...";

    // Insere no HTML
    container.replaceChildren(autocompleteRestaurantes);

    // Botão da lupa (caso exista no HTML)
    const botaoPesquisa = document.getElementById("btn-foco-autocomplete");

    if (botaoPesquisa) {
      botaoPesquisa.addEventListener("click", () => {
        autocompleteRestaurantes.focus();
      });
    }

    // Prioriza os resultados próximos ao mapa
    map.addListener("bounds_changed", () => {
      const limites = map.getBounds();

      if (limites && autocompleteRestaurantes) {
        autocompleteRestaurantes.locationBias = limites;
      }
    });

    // SELEÇÃO DO ESTABELECIMENTO
    autocompleteRestaurantes.addEventListener("gmp-select", async (event) => {
      try {
        const restaurante = event.placePrediction.toPlace();

        console.log("Estabelecimento selecionado:", restaurante.id);

        // Abre o painel existente
        await abrirPainel(restaurante);
      } catch (erro) {
        console.error("Erro ao selecionar estabelecimento:", erro);
      }
    });

    console.log("Place Autocomplete inicializado com sucesso!");
  } catch (erro) {
    console.error("Erro ao inicializar Place Autocomplete:", erro);
  }
}

// LOCALIZAÇÃO DO USUÁRIO
async function obterLocalizacao() {
  if (!navigator.geolocation) {
    alert("Seu navegador não suporta geolocalização.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      console.log("Latitude:", pos.lat);
      console.log("Longitude:", pos.lng);
      console.log("Precisão:", position.coords.accuracy, "metros");

      map.setCenter(pos);
      map.setZoom(17);

      // Biblioteca de marcadores
      const { AdvancedMarkerElement } =
        await google.maps.importLibrary("marker");
      // Cria ou atualiza marcador do usuário
      if (marcadorUsuario) {
        marcadorUsuario.position = pos;
      } else {
        const pontoAzul = document.createElement("div");
        pontoAzul.classList.add("marcador-localizacao");
        marcadorUsuario = new AdvancedMarkerElement({
          map: map,
          position: pos,
          title: "Sua localização",
          anchorLeft: "-50%",
          anchorTop: "-50%",
          zIndex: 1000,
        });

        marcadorUsuario.append(pontoAzul);
      }

      // Busca restaurantes próximos
      await buscarRestaurantes(pos);
    },
    (erro) => {
      console.error("Erro na localização:", erro);
      alert(
        "Não foi possível obter sua localização. Verifique a permissão de localização do navegador.",
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    },
  );
}

// Exploração mantém os resultados na memória da página; ordenar/origem não consultam novamente o Google.
const filtroCategoria = new URLSearchParams(location.search).get("categoria");
const buscaTexto =
  new URLSearchParams(location.search).get("busca")?.trim() || "";
const tiposPesquisa = Aponte.categorias[filtroCategoria]?.tipos || [
  "restaurant",
];
const estadoBusca = {
  centro: { lat: -20.2839, lng: -50.2464 },
  raio: 2000,
  ordem: "proximos",
  origem: "todos",
  google: [],
  statusGoogle: "aguardando",
  sequencia: 0,
};
let proprios = [],
  marcadoresProprios = [],
  sequenciaPainel = 0,
  selecionadoRef = null,
  minhaAvaliacao = null,
  favoritado = false;
let sequenciaMarcadores = 0;
let resumoProprios = new Map(),
  resumosDisponiveis = false,
  googleChave = null,
  scrollResultados = 0;
const cacheBuscas = new Map(),
  cardsResultados = new Map();
const utilMapa = ExploracaoMapa;
const normalizarNome = utilMapa.normalizar;
const propriosPromise = Promise.all([
  Aponte.api("/api/estabelecimentos"),
  Aponte.api("/api/estabelecimentos/avaliacoes")
    .then((itens) => {
      resumoProprios = new Map(itens.map((e) => [String(e.id), e]));
      resumosDisponiveis = true;
    })
    .catch(() => {}),
])
  .then(([itens]) => {
    proprios = itens.filter((e) => !e.googlePlaceId && e.dadosProprios);
    const id = new URLSearchParams(location.search).get("id"),
      e = proprios.find((e) => String(e.id) === id);
    if (e) {
      const c = utilMapa.coordenadas(e.dadosProprios);
      if (c) estadoBusca.centro = c;
      abrirProprio(e);
    }
    atualizarResultados();
    return proprios;
  })
  .catch((e) => {
    Aponte.aviso(e.message, true, "mapa-status");
    atualizarResultados();
    return [];
  });
function propriosVisiveis() {
  return proprios.filter(
    (e) =>
      Aponte.correspondeFiltro(e.dadosProprios, filtroCategoria) &&
      (!buscaTexto ||
        normalizarNome(e.dadosProprios.nome).includes(
          normalizarNome(buscaTexto),
        )),
  );
}
function correspondeCategoriaGoogle(p) {
  return (
    !filtroCategoria ||
    !Aponte.categorias[filtroCategoria] ||
    tiposPesquisa.some((t) => p.primaryType === t || p.types?.includes(t))
  );
}
function dadosResultados() {
  const lista = propriosVisiveis().map((e) => {
    const r =
      resumoProprios.get(String(e.id)) ||
      (resumosDisponiveis ? { quantidade: 0, media: null } : null);
    return {
      chave: "aponte:" + e.id,
      nome: e.dadosProprios.nome,
      categoria: (
        Aponte.categorias[e.dadosProprios.categoria] ||
        Aponte.categorias.restaurantes
      ).nome,
      origem: "aponte",
      coordenadas: utilMapa.coordenadas(e.dadosProprios),
      nota: r?.media ?? null,
      quantidade: r?.quantidade ?? null,
      dado: e,
    };
  });
  for (const p of estadoBusca.google)
    if (correspondeCategoriaGoogle(p))
      lista.push({
        chave: "google:" + p.id,
        nome: p.displayName || "Estabelecimento Google",
        categoria: Aponte.classificar(p).nome,
        origem: "google",
        coordenadas: utilMapa.coordenadas(p.location),
        nota: Number.isFinite(p.rating) ? p.rating : null,
        quantidade: Number.isFinite(p.userRatingCount)
          ? p.userRatingCount
          : null,
        dado: p,
      });
  return lista;
}
function resultadosVisiveis() {
  return utilMapa.elegiveis(dadosResultados(), estadoBusca);
}
function cardResultado(e) {
  let card = cardsResultados.get(e.chave);
  if (!card || card._dado !== e.dado) {
    card = Aponte.el("article", "resultado-restaurante");
    card.dataset.resultado = e.chave;
    card._dado = e.dado;
    const foto = Aponte.el("img", "resultado-foto");
    foto.alt = "Fotografia de " + e.nome;
    foto.loading = "lazy";
    const creditos = Aponte.el("div", "creditos"),
      abrir = Aponte.el("button", "resultado-abrir");
    abrir.type = "button";
    const nome = Aponte.el("h2", "h6", e.nome);
    abrir.append(nome);
    abrir.onclick = () => {
      if (e.origem === "aponte") abrirProprio(e.dado);
      else abrirPainel(e.dado);
    };
    const origem = Aponte.el(
      "span",
      "resultado-origem " + e.origem,
      e.origem === "aponte" ? "Cadastro Aponte" : "Google Maps",
    );
    const categoria = Aponte.el("p", "resultado-categoria", e.categoria),
      nota = Aponte.el("p", "resultado-nota"),
      distancia = Aponte.el("span", "resultado-distancia");
    if (e.origem === "google") Aponte.fotoGoogle(e.dado, foto, creditos);
    else Aponte.fotoPropria(e.dado, foto, creditos);
    card.append(foto, creditos, abrir, categoria, origem, nota, distancia);
    cardsResultados.set(e.chave, card);
  }
  const plataforma = e.origem === "aponte" ? "Aponte" : "Google";
  card.querySelector(".resultado-nota").textContent =
    e.nota != null
      ? `★ ${Number(e.nota).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${e.quantidade != null ? e.quantidade + " avaliações no " + plataforma : "nota do " + plataforma}`
      : e.quantidade === 0
        ? "Ainda sem avaliações no " + plataforma
        : "Avaliação indisponível no " + plataforma;
  card.querySelector(".resultado-distancia").textContent =
    utilMapa.formatarDistancia(e.distancia);
  return card;
}
function atualizarResultados() {
  const lista = document.getElementById("lista-resultados");
  if (!lista) return;
  const visiveis = resultadosVisiveis();
  lista.replaceChildren(...visiveis.map(cardResultado));
  const pendente =
    estadoBusca.statusGoogle === "carregando" &&
    estadoBusca.origem !== "aponte";
  lista.setAttribute("aria-busy", String(pendente));
  if (!visiveis.length)
    lista.append(
      Aponte.el(
        "p",
        pendente ? "vazio placeholder-glow" : "vazio",
        pendente
          ? "Buscando restaurantes nesta área…"
          : "Nenhum resultado corresponde à busca e aos filtros nesta área.",
      ),
    );
  document.getElementById("quantidade-resultados").textContent =
    `${visiveis.length} ${visiveis.length === 1 ? "lugar encontrado" : "lugares encontrados"}`;
  const invalidos = dadosResultados().filter((e) => !e.coordenadas).length;
  document.getElementById("coordenadas-status").textContent = invalidos
    ? `${invalidos} registro(s) sem coordenadas válidas não foram incluídos na distância máxima.`
    : "";
  document.getElementById("mapa-carregando").hidden = !pendente;
  sincronizarMarcadores(visiveis).catch(() =>
    Aponte.aviso(
      "Não foi possível atualizar os marcadores. Os resultados continuam disponíveis na lista.",
      true,
      "mapa-status",
    ),
  );
}
async function sincronizarMarcadores(itens) {
  const seq = ++sequenciaMarcadores;
  if (!map || !window.google?.maps?.importLibrary) return;
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  if (seq !== sequenciaMarcadores) return;
  for (const m of [...marcadores, ...marcadoresProprios]) m.map = null;
  marcadores = [];
  marcadoresProprios = [];
  for (const e of itens) {
    const pin = Aponte.pin(
      e.origem === "aponte"
        ? Aponte.iconeProprio(e.dado.dadosProprios)
        : Aponte.classificar(e.dado).icone,
      e.origem,
    );
    const m = new AdvancedMarkerElement({
      map,
      position: e.coordenadas,
      title: e.nome,
      gmpClickable: true,
      anchorLeft: "-50%",
      anchorTop: "-100%",
    });
    m.chave = e.chave;
    m.append(pin);
    m.addEventListener("gmp-click", () => {
      e.origem === "aponte" ? abrirProprio(e.dado) : abrirPainel(e.dado);
    });
    (e.origem === "aponte" ? marcadoresProprios : marcadores).push(m);
  }
  if (marcadorPesquisa) {
    const d = utilMapa.distancia(estadoBusca.centro, marcadorPesquisa.position);
    marcadorPesquisa.map =
      estadoBusca.origem !== "aponte" &&
      marcadorPesquisa.categoriaCompativel !== false &&
      d != null &&
      d <= estadoBusca.raio
        ? map
        : null;
  }
  destacarSelecionado();
}
function destacarSelecionado() {
  const chave = selecionadoRef
    ? selecionadoRef.googlePlaceId
      ? "google:" + selecionadoRef.googlePlaceId
      : "aponte:" + selecionadoRef.id
    : null;
  for (const m of [...marcadores, ...marcadoresProprios]) {
    m.querySelector?.(".icone-comida")?.classList.toggle(
      "ativo",
      m.chave === chave,
    );
    m.zIndex = m.chave === chave ? 100 : 1;
  }
}
async function mostrarMarcadoresProprios() {
  await propriosPromise;
  await sincronizarMarcadores(resultadosVisiveis());
}
function voltarResultados() {
  if (marcadorPesquisa) {
    marcadorPesquisa.map = null;
    marcadorPesquisa = null;
  }
  document.getElementById("painel-restaurante").classList.remove("aberto");
  document.getElementById("explorar-resultados").hidden = false;
  ++sequenciaPainel;
  document.getElementById("explorar-resultados").scrollTop = scrollResultados;
  map?.panTo(estadoBusca.centro);
  const chave = selecionadoRef
    ? selecionadoRef.googlePlaceId
      ? "google:" + selecionadoRef.googlePlaceId
      : "aponte:" + selecionadoRef.id
    : null;
  const card = [...document.querySelectorAll("[data-resultado]")].find(
    (n) => n.dataset.resultado === chave,
  );
  card?.querySelector("button")?.focus({ preventScroll: true });
}
async function buscarRestaurantes(pos) {
  const centro = utilMapa.coordenadas(pos);
  if (centro) estadoBusca.centro = centro;
  await propriosPromise;
  atualizarResultados();
  if (estadoBusca.origem === "aponte") return;
  const chave = JSON.stringify([
    estadoBusca.centro,
    estadoBusca.raio,
    filtroCategoria,
    buscaTexto,
  ]);
  const cache = cacheBuscas.get(chave);
  if (cache && Date.now() - cache.quando < 120000) {
    estadoBusca.google = cache.itens;
    googleChave = chave;
    estadoBusca.statusGoogle = "pronto";
    atualizarResultados();
    return;
  }
  if (googleChave === chave && estadoBusca.statusGoogle === "carregando")
    return;
  const seq = ++estadoBusca.sequencia;
  googleChave = chave;
  estadoBusca.google = [];
  if (!window.google?.maps?.importLibrary) {
    estadoBusca.statusGoogle = "indisponivel";
    atualizarResultados();
    return;
  }
  estadoBusca.statusGoogle = "carregando";
  atualizarResultados();
  try {
    const { Place, SearchNearbyRankPreference } =
      await google.maps.importLibrary("places");
    const fields = [
      "id",
      "displayName",
      "location",
      "formattedAddress",
      "primaryType",
      "primaryTypeDisplayName",
      "types",
      "rating",
      "userRatingCount",
      "photos",
    ];
    const request = buscaTexto
      ? {
          textQuery: buscaTexto,
          fields,
          locationRestriction: utilMapa.limites(
            estadoBusca.centro,
            estadoBusca.raio,
          ),
          maxResultCount: 20,
          language: "pt-BR",
          ...(tiposPesquisa.length === 1
            ? { includedType: tiposPesquisa[0], useStrictTypeFiltering: true }
            : {}),
        }
      : {
          fields,
          locationRestriction: {
            center: estadoBusca.centro,
            radius: estadoBusca.raio,
          },
          includedTypes: tiposPesquisa,
          maxResultCount: 20,
          rankPreference: SearchNearbyRankPreference.DISTANCE,
          language: "pt-BR",
        };
    const { places } = await (buscaTexto
      ? Place.searchByText(request)
      : Place.searchNearby(request));
    if (seq !== estadoBusca.sequencia) return;
    estadoBusca.google = places || [];
    estadoBusca.statusGoogle = "pronto";
    cacheBuscas.set(chave, { quando: Date.now(), itens: estadoBusca.google });
    if (cacheBuscas.size > 8)
      cacheBuscas.delete(cacheBuscas.keys().next().value);
    document.getElementById("mapa-status").textContent = "";
  } catch (erro) {
    if (seq !== estadoBusca.sequencia) return;
    estadoBusca.statusGoogle = "erro";
    Aponte.aviso(
      "A pesquisa Google não foi concluída. Os lugares próprios compatíveis continuam disponíveis; tente pesquisar nesta área novamente.",
      true,
      "mapa-status",
    );
  } finally {
    if (seq === estadoBusca.sequencia) atualizarResultados();
  }
}
function prepararFiltros() {
  document
    .getElementById("filtros-mapa")
    .addEventListener("submit", (e) => e.preventDefault());
  const raio = document.getElementById("filtro-distancia"),
    ordem = document.getElementById("filtro-ordem"),
    origem = document.getElementById("filtro-origem");
  raio.addEventListener("change", () => {
    estadoBusca.raio = Number(raio.value);
    const centro = utilMapa.coordenadas(map?.getCenter()) || estadoBusca.centro;
    map?.fitBounds?.(utilMapa.limites(centro, estadoBusca.raio));
    buscarRestaurantes(centro);
  });
  ordem.addEventListener("change", () => {
    estadoBusca.ordem = ordem.value;
    atualizarResultados();
  });
  origem.addEventListener("change", () => {
    estadoBusca.origem = origem.value;
    atualizarResultados();
    if (origem.value !== "aponte") buscarRestaurantes(estadoBusca.centro);
  });
}
prepararFiltros();
function iniciarPainel(ref, nome, origem, categoria) {
  const seq = ++sequenciaPainel;
  if (marcadorPesquisa) {
    marcadorPesquisa.map = null;
    marcadorPesquisa = null;
  }
  selecionadoRef = ref;
  minhaAvaliacao = null;
  favoritado = false;
  const explorar = document.getElementById("explorar-resultados");
  if (!explorar.hidden) scrollResultados = explorar.scrollTop;
  explorar.hidden = true;
  document.getElementById("painel-restaurante").classList.add("aberto");
  destacarSelecionado();
  document.getElementById("painel-restaurante").scrollTop = 0;
  document
    .getElementById("painel-restaurante")
    .setAttribute("aria-busy", "true");
  document.getElementById("media-google").textContent = "—";
  document.getElementById("media-aponte").textContent = "—";
  document.getElementById("resumo-avaliacoes").textContent = "Carregando…";
  document.getElementById("avaliacao-acesso").replaceChildren();
  Aponte.galeria(document.getElementById("area-foto"), [], false, categoria);
  document.getElementById("nome-restaurante").textContent = nome;
  document.getElementById("origem-restaurante").textContent = origem;
  for (const id of [
    "endereco-restaurante",
    "telefone-restaurante",
    "tipo-restaurante",
    "descricao-propria",
    "avaliacao-restaurante",
    "acao-status",
  ])
    document.getElementById(id).textContent = "";
  document.getElementById("site-restaurante").hidden = true;
  document.getElementById("telefone-restaurante").removeAttribute("href");
  document.getElementById("horarios-restaurante").replaceChildren();
  document.getElementById("itens-cardapio").textContent =
    "Carregando cardápio…";
  document.getElementById("lista-avaliacoes").replaceChildren();
  document.getElementById("avaliacao-form").hidden = true;
  document.getElementById("excluir-minha-avaliacao").hidden = true;
  document.getElementById("favoritar").disabled = true;
  return seq;
}
function rota(nome, lat, lng, placeId) {
  const u = new URL("https://www.google.com/maps/dir/");
  u.search = new URLSearchParams({
    api: "1",
    destination: lat != null && lng != null ? `${lat},${lng}` : nome,
    travelmode: "driving",
    ...(placeId ? { destination_place_id: placeId } : {}),
  });
  document.getElementById("rota-restaurante").href = u.href;
}
async function abrirProprio(e) {
  const d = e.dadosProprios,
    seq = iniciarPainel(
      { id: e.id },
      d.nome,
      "Cadastro próprio do Aponte",
      d.categoria,
    );
  document.getElementById("endereco-restaurante").textContent =
    Aponte.endereco(d);
  document.getElementById("descricao-propria").textContent = d.descricao;
  document.getElementById("tipo-restaurante").textContent = (
    Aponte.categorias[d.categoria] || Aponte.categorias.restaurantes
  ).nome;
  document.getElementById("telefone-restaurante").textContent =
    "Consulte o estabelecimento";
  document.getElementById("avaliacao-restaurante").textContent =
    "Sem vínculo com o Google Places";
  Aponte.galeria(
    document.getElementById("area-foto"),
    Aponte.fotografiasProprias(e),
    false,
    d.categoria,
  );
  rota(d.nome, d.latitude, d.longitude, null);
  if (map) map.panTo({ lat: Number(d.latitude), lng: Number(d.longitude) });
  await carregarInteracoes({ id: e.id }, seq);
  if (seq === sequenciaPainel)
    document
      .getElementById("painel-restaurante")
      .setAttribute("aria-busy", "false");
}
async function abrirPainel(restaurante) {
  const ref = { googlePlaceId: restaurante.id },
    seq = iniciarPainel(
      ref,
      restaurante.displayName || "Estabelecimento Google",
      "Google Places",
      Aponte.classificar(restaurante).chave,
    );
  rota(
    restaurante.displayName || "Estabelecimento",
    null,
    null,
    restaurante.id,
  );
  const detalhes = (async () => {
    try {
      const p = await Aponte.place(restaurante.id);
      if (seq !== sequenciaPainel) return;
      document.getElementById("nome-restaurante").textContent =
        p.displayName || "Estabelecimento";
      document.getElementById("endereco-restaurante").textContent =
        p.formattedAddress || "Endereço não informado";
      document.getElementById("telefone-restaurante").textContent =
        p.nationalPhoneNumber || "Telefone não informado";
      if (p.nationalPhoneNumber)
        document.getElementById("telefone-restaurante").href =
          "tel:" + p.nationalPhoneNumber.replace(/[^\d+]/g, "");
      const site = document.getElementById("site-restaurante");
      try {
        const u = new URL(p.websiteURI);
        if (["http:", "https:"].includes(u.protocol)) {
          site.href = u.href;
          site.textContent = u.hostname;
          site.hidden = false;
        }
      } catch {}
      for (const horario of p.regularOpeningHours?.weekdayDescriptions || [])
        document
          .getElementById("horarios-restaurante")
          .append(Aponte.el("li", "", horario));
      document.getElementById("media-google").textContent =
        p.rating != null
          ? Number(p.rating).toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })
          : "—";
      document.getElementById("avaliacao-restaurante").textContent =
        p.rating != null
          ? p.userRatingCount != null
            ? `${p.userRatingCount} avaliações no Google`
            : "Quantidade não informada"
          : "Sem avaliações disponíveis no Google";
      document.getElementById("tipo-restaurante").textContent =
        Aponte.classificar(p).nome;
      Aponte.galeria(
        document.getElementById("area-foto"),
        p.photos,
        true,
        Aponte.classificar(p).chave,
      );
      if (p.location) {
        if (
          map &&
          estadoBusca.origem !== "aponte" &&
          !marcadores.some((m) => m.chave === "google:" + p.id)
        ) {
          const { AdvancedMarkerElement } =
            await google.maps.importLibrary("marker");
          if (seq !== sequenciaPainel) return;
          if (marcadorPesquisa) marcadorPesquisa.map = null;
          marcadorPesquisa = new AdvancedMarkerElement({
            map:
              correspondeCategoriaGoogle(p) &&
              utilMapa.distancia(estadoBusca.centro, p.location) <=
                estadoBusca.raio
                ? map
                : null,
            position: p.location,
            title: p.displayName,
            gmpClickable: true,
            anchorLeft: "-50%",
            anchorTop: "-100%",
          });
          marcadorPesquisa.categoriaCompativel = correspondeCategoriaGoogle(p);
          marcadorPesquisa.append(
            Aponte.pin(Aponte.classificar(p).icone, "google"),
          );
          marcadorPesquisa.addEventListener("gmp-click", () => abrirPainel(p));
        }
        map?.panTo(p.location);
        rota(p.displayName, p.location.lat(), p.location.lng(), p.id);
      }
    } catch (e) {
      if (seq === sequenciaPainel) {
        document.getElementById("endereco-restaurante").textContent =
          "Detalhes do Google indisponíveis neste momento.";
        document.getElementById("avaliacao-restaurante").textContent =
          "Avaliação do Google indisponível.";
      }
    }
  })();
  await Promise.all([detalhes, carregarInteracoes(ref, seq)]);
  if (seq === sequenciaPainel)
    document
      .getElementById("painel-restaurante")
      .setAttribute("aria-busy", "false");
}
async function carregarInteracoes(ref, seq) {
  try {
    const q = Aponte.consulta(ref);
    const [cardapio, lista, resumo, sessao] = await Promise.all([
      Aponte.api("/api/cardapios?" + q),
      Aponte.api("/api/avaliacoes?" + q),
      Aponte.api("/api/avaliacoes/resumo?" + q),
      Aponte.sessao,
    ]);
    if (seq !== sequenciaPainel) return;
    if (ref.id != null) {
      resumoProprios.set(String(ref.id), resumo);
      atualizarResultados();
    }
    const c = document.getElementById("itens-cardapio");
    c.replaceChildren();
    if (!cardapio.length)
      c.append(
        Aponte.el("p", "", "Nenhum item de cardápio cadastrado no Aponte."),
      );
    for (const item of cardapio) {
      const bloco = Aponte.el("div", "border-bottom py-2");
      bloco.append(
        Aponte.el("strong", "", item.nome),
        Aponte.el("p", "", item.descricao),
        Aponte.el(
          "span",
          "",
          new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(item.preco),
        ),
      );
      c.append(bloco);
    }
    document.getElementById("media-aponte").textContent = resumo.quantidade
      ? Number(resumo.media).toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : "—";
    document.getElementById("resumo-avaliacoes").textContent = resumo.quantidade
      ? `${resumo.quantidade} ${resumo.quantidade === 1 ? "avaliação" : "avaliações"} no Aponte`
      : "Ainda não avaliado no Aponte";
    const n = document.getElementById("lista-avaliacoes");
    n.replaceChildren();
    for (const a of lista) {
      const bloco = Aponte.el("article", "avaliacao-item");
      bloco.append(
        Aponte.el(
          "strong",
          "",
          `${a.nota}/5 — ${a.usuarioId === sessao.usuarioId ? "Sua avaliação" : "Usuário " + a.usuarioId}`,
        ),
        Aponte.el("p", "", a.comentario || "Sem comentário"),
      );
      n.append(bloco);
    }
    const acesso = document.getElementById("avaliacao-acesso");
    acesso.replaceChildren();
    const b = document.getElementById("favoritar");
    b.disabled = false;
    if (sessao.autenticado && !sessao.administrador) {
      minhaAvaliacao =
        lista.find((a) => a.usuarioId === sessao.usuarioId) || null;
      document.getElementById("nota").value = minhaAvaliacao?.nota || 5;
      document.getElementById("comentario").value =
        minhaAvaliacao?.comentario || "";
      document.getElementById("avaliacao-form").hidden = false;
      document.getElementById("excluir-minha-avaliacao").hidden =
        !minhaAvaliacao;
      favoritado = await Aponte.api("/api/me/favoritos/existe?" + q);
      if (seq !== sequenciaPainel) return;
      b.textContent = favoritado ? "Remover dos favoritos" : "Favoritar";
    } else if (sessao.administrador) {
      b.disabled = true;
      b.textContent = "Conta administrativa";
      acesso.textContent =
        "Para avaliar ou favoritar, entre com uma conta de usuário.";
    } else {
      b.textContent = "Entrar para favoritar";
      const a = Aponte.el("a", "link-danger", "Entre para avaliar");
      a.href = "/entra.html";
      acesso.append(a);
    }
  } catch (e) {
    if (seq === sequenciaPainel) {
      Aponte.aviso(e.message, true, "acao-status");
      document.getElementById("resumo-avaliacoes").textContent =
        "Avaliações do Aponte indisponíveis.";
      document.getElementById("itens-cardapio").textContent =
        "Não foi possível carregar o cardápio.";
    }
  }
}
document.getElementById("favoritar").addEventListener("click", async () => {
  const s = await Aponte.sessao;
  if (!s.autenticado) {
    location.href = "/entra.html";
    return;
  }
  const ref = selecionadoRef,
    seq = sequenciaPainel,
    b = document.getElementById("favoritar");
  b.disabled = true;
  try {
    if (favoritado)
      await Aponte.api("/api/me/favoritos?" + Aponte.consulta(ref), {
        method: "DELETE",
      });
    else await Aponte.api("/api/me/favoritos", { method: "POST", body: ref });
    if (seq === sequenciaPainel) {
      Aponte.aviso("Favoritos atualizados.", false, "acao-status");
      await carregarInteracoes(ref, seq);
    }
  } catch (e) {
    if (seq === sequenciaPainel) Aponte.aviso(e.message, true, "acao-status");
  } finally {
    if (seq === sequenciaPainel) b.disabled = false;
  }
});
document
  .getElementById("avaliacao-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const ref = selecionadoRef,
      seq = sequenciaPainel;
    const dados = {
      nota: Number(document.getElementById("nota").value),
      comentario: document.getElementById("comentario").value,
    };
    const b = e.target.querySelector("button[type=submit]");
    Aponte.ocupado(b, true, "Salvando…");
    try {
      await Aponte.api(
        minhaAvaliacao
          ? "/api/me/avaliacoes/" + minhaAvaliacao.id
          : "/api/me/avaliacoes",
        {
          method: minhaAvaliacao ? "PUT" : "POST",
          body: minhaAvaliacao ? dados : { referencia: ref, dados },
        },
      );
      if (seq === sequenciaPainel) {
        await carregarInteracoes(ref, seq);
        Aponte.aviso("Avaliação salva.", false, "acao-status");
      }
    } catch (err) {
      if (seq === sequenciaPainel)
        Aponte.aviso(err.message, true, "acao-status");
    } finally {
      Aponte.ocupado(b, false);
    }
  });
document
  .getElementById("excluir-minha-avaliacao")
  .addEventListener("click", async () => {
    if (!minhaAvaliacao) return;
    const ref = selecionadoRef,
      seq = sequenciaPainel;
    try {
      await Aponte.api("/api/me/avaliacoes/" + minhaAvaliacao.id, {
        method: "DELETE",
      });
      if (seq === sequenciaPainel) {
        await carregarInteracoes(ref, seq);
        Aponte.aviso("Avaliação excluída.", false, "acao-status");
      }
    } catch (e) {
      if (seq === sequenciaPainel) Aponte.aviso(e.message, true, "acao-status");
    }
  });
document
  .getElementById("fechar-painel")
  .addEventListener("click", voltarResultados);
window.gm_authFailure = () =>
  Aponte.aviso(
    "Não foi possível carregar o Google Maps. Consulte os lugares próprios na lista de resultados.",
    true,
    "mapa-status",
  );
window.initMap = initMap;

// Um SDK indisponível não deixa o spinner ativo nem bloqueia os registros próprios.
document.addEventListener("DOMContentLoaded", () => {
  const sdk = [...document.scripts].find((s) =>
    s.src.startsWith("https://maps.googleapis.com/maps/api/js"),
  );
  const indisponivel = () => {
    document.getElementById("mapa-carregando").hidden = true;
    const aviso = document.querySelector(".mapa-placeholder small");
    if (aviso)
      aviso.textContent =
        "Consulte os cadastros próprios na lista de resultados ao lado do mapa.";
    Aponte.aviso(
      "Google Maps indisponível. Você pode consultar os lugares próprios na lista de resultados.",
      true,
      "mapa-status",
    );
  };
  if (!sdk) indisponivel();
  else {
    sdk.addEventListener("error", indisponivel);
    setTimeout(() => {
      if (!map) indisponivel();
    }, 20000);
  }
});
