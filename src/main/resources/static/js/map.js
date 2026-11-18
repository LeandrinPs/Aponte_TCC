let map;
let marcadores = [];
let marcadorUsuario = null;

let autocompleteRestaurantes = null;
let marcadorPesquisa = null;
async function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: {
      lat: -20.2839,
      lng: -50.2464,
    },
    zoom: 15,
    mapId: document.getElementById("map-container").dataset.mapId,
    clickableIcons: true,
  });
  window.map = map;
  document.getElementById("mapa-status").textContent = "";

  await configurarPlaceAutocomplete();
  await mostrarMarcadoresProprios();

  

  const params = new URLSearchParams(location.search);

if (params.get("placeId")) {
    await abrirPainel({ id: params.get("placeId") });
}
else if (params.get("id")) {

    const e = (await propriosPromise).find(
        (e) => String(e.id) === params.get("id")
    );

    if (e) {
        if (selecionadoRef?.id !== e.id) {
            await abrirProprio(e);
        } else {
            map.panTo({
                lat: Number(e.dadosProprios.latitude),
                lng: Number(e.dadosProprios.longitude)
            });
        }
    } else {
        Aponte.aviso(
            "Cadastro próprio não encontrado.",
            true,
            "mapa-status"
        );
    }

}
else {

    // Solicita a localização automaticamente
    obterLocalizacao();

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

        // Centraliza o mapa
        if (restaurante.location) {
          map.panTo(restaurante.location);

          map.setZoom(17);

          const { AdvancedMarkerElement } =
            await google.maps.importLibrary("marker");

          // Remove marcador anterior
          if (marcadorPesquisa) {
            marcadorPesquisa.map = null;
          }

          // Cria novo marcador
          marcadorPesquisa = new AdvancedMarkerElement({
            map: map,

            position: restaurante.location,

            title: restaurante.displayName || "Estabelecimento selecionado",

            gmpClickable: true,
          });
        }
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

      Aponte.aviso(
          "Seu navegador não suporta geolocalização. Exibindo localização padrão.",
          true,
          "mapa-status"
      );

      await buscarRestaurantes({
          lat: -20.2839,
          lng: -50.2464
      });

      return;
  }

  navigator.geolocation.getCurrentPosition(

      async (position) => {

          const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
          };

          console.log("Localização do usuário:", pos);

          // Centraliza o mapa
          map.setCenter(pos);
          map.setZoom(17);

          // Importa marcadores
          const { AdvancedMarkerElement } =
              await google.maps.importLibrary("marker");

          // Cria o marcador azul
          const pontoAzul = document.createElement("div");

          pontoAzul.classList.add("marcador-localizacao");

          if (marcadorUsuario) {

              marcadorUsuario.position = pos;

          } else {

              marcadorUsuario = new AdvancedMarkerElement({
                  map: map,
                  position: pos,
                  title: "Sua localização",
                  anchorLeft: "-50%",
                  anchorTop: "-50%",
                  zIndex: 1000
              });

              marcadorUsuario.append(pontoAzul);
          }

          // Busca restaurantes próximos
          await buscarRestaurantes(pos);

      },

      async (erro) => {

          console.warn("Localização não autorizada:", erro);

          let mensagem = "Não foi possível obter sua localização.";

          if (erro.code === 1) {
              mensagem = "Permissão de localização negada. Exibindo estabelecimentos da região padrão.";
          }

          Aponte.aviso(
              mensagem,
              false,
              "mapa-status"
          );

          // Continua utilizando o mapa normalmente
          await buscarRestaurantes({
              lat: -20.2839,
              lng: -50.2464
          });

      },

      {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
      }

  );
}
// BUSCAR RESTAURANTES PRÓXIMOS
async function buscarRestaurantes(pos) {
  try {
    const { Place, SearchNearbyRankPreference } =
      await google.maps.importLibrary("places");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    // Busca estabelecimentos em um raio de 2 km

    const { places } = await Place.searchNearby({
      fields: ["id", "displayName", "location", "formattedAddress"],

      locationRestriction: {
        center: pos,

        radius: 2000,
      },

      includedTypes: [tipoPesquisa],

      maxResultCount: 10,

      rankPreference: SearchNearbyRankPreference.DISTANCE,
    });

    // Remove marcadores anteriores

    marcadores.forEach((marcador) => {
      marcador.map = null;
    });

    marcadores = [];

    if (!places || places.length === 0) {
      Aponte.aviso(
        "Nenhum resultado Google nesta área. Os cadastros próprios continuam disponíveis.",
        false,
        "mapa-status",
      );

      return;
    }

    // Cria marcadores

    places.forEach((restaurante) => {
      if (!restaurante.location || correspondeAProprio(restaurante)) return;

      const icone = document.createElement("div");

      icone.classList.add("icone-comida");

      icone.textContent = "🍽️";

      const marcador = new AdvancedMarkerElement({
        map: map,

        position: restaurante.location,

        title: restaurante.displayName,

        gmpClickable: true,

        anchorLeft: "-50%",

        anchorTop: "-50%",
      });

      marcador.append(icone);

      marcador.addEventListener("gmp-click", () => {
        document.querySelectorAll(".icone-comida.ativo").forEach((elemento) => {
          elemento.classList.remove("ativo");
        });

        icone.classList.add("ativo");

        abrirPainel(restaurante);
      });

      marcadores.push(marcador);
    });

    console.log(places.length, "restaurantes encontrados.");
  } catch (erro) {
    console.error("Erro na Places API:", erro);

    Aponte.aviso(
      "Não foi possível pesquisar no Google agora. Consulte os cadastros próprios abaixo.",
      true,
      "mapa-status",
    );
  }
}

// As duas coleções de marcadores são independentes: pesquisas Google nunca apagam os próprios.
const tiposPesquisa = {
  pizzarias: "pizza_restaurant",
  hamburguerias: "hamburger_restaurant",
  cafeterias: "cafe",
  japoneses: "japanese_restaurant",
  churrascarias: "barbecue_restaurant",
  brasileira: "brazilian_restaurant",
};
const tipoPesquisa =
  tiposPesquisa[new URLSearchParams(location.search).get("categoria")] ||
  "restaurant";
let proprios = [],
  marcadoresProprios = [],
  sequenciaPainel = 0,
  selecionadoRef = null,
  minhaAvaliacao = null,
  favoritado = false;
const propriosPromise = Aponte.api("/api/estabelecimentos")
  .then((itens) => {
    proprios = itens;
    renderizarProprios();
    return itens;
  })
  .catch((e) => {
    Aponte.aviso(e.message, true, "mapa-status");
    return [];
  });
function normalizarNome(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function correspondeAProprio(p) {
  return proprios.some((e) => {
    const d = e.dadosProprios;
    if (normalizarNome(p.displayName) !== normalizarNome(d.nome)) return false;
    const lat = p.location.lat(),
      lng = p.location.lng();
    const metros = Math.hypot(
      (lat - Number(d.latitude)) * 111320,
      (lng - Number(d.longitude)) * 111320 * Math.cos((lat * Math.PI) / 180),
    );
    return metros < 40;
  });
}
function renderizarProprios() {
  const lista = document.getElementById("cards-proprios");
  lista.replaceChildren();
  const busca = new URLSearchParams(location.search).get("busca");
  const visiveis = busca
    ? proprios.filter((e) =>
        normalizarNome(e.dadosProprios.nome).includes(normalizarNome(busca)),
      )
    : proprios;
  if (!visiveis.length)
    lista.append(
      Aponte.el(
        "p",
        "",
        "Nenhum cadastro próprio disponível. Explore os resultados do Google no mapa.",
      ),
    );
  for (const e of visiveis) {
    const col = Aponte.el("div", "col-md-4");
    const card = Aponte.el("article", "card h-100");
    const img = Aponte.el("img", "card-img-top foto-card");
    img.alt = e.dadosProprios.nome;
    Aponte.imagem(img, e.fotoUrl);
    const body = Aponte.el("div", "card-body");
    body.append(
      Aponte.el("h3", "h5", e.dadosProprios.nome),
      Aponte.el("p", "", Aponte.endereco(e.dadosProprios)),
    );
    const abrir = Aponte.el(
      "button",
      "btn btn-outline-danger",
      "Ver estabelecimento",
    );
    abrir.onclick = () => {
      history.replaceState(null, "", "/map.html?id=" + e.id);
      abrirProprio(e);
      document
        .getElementById("painel-restaurante")
        .scrollIntoView({ behavior: "smooth" });
    };
    body.append(abrir);
    card.append(img, body);
    col.append(card);
    lista.append(col);
  }
  if (!window.google?.maps)
    Aponte.aviso(
      "O mapa Google ainda não está disponível. Consulte os estabelecimentos próprios abaixo.",
      false,
      "mapa-status",
    );
  const id = new URLSearchParams(location.search).get("id");
  const e = proprios.find((e) => String(e.id) === id);
  if (e) abrirProprio(e);
}
async function mostrarMarcadoresProprios() {
  await propriosPromise;
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  for (const e of proprios) {
    const d = e.dadosProprios;
    const icone = Aponte.el("div", "icone-comida proprio", "A");
    icone.title = "Cadastro próprio do Aponte";
    const marcador = new AdvancedMarkerElement({
      map,
      position: { lat: Number(d.latitude), lng: Number(d.longitude) },
      title: d.nome,
      gmpClickable: true,
    });
    marcador.append(icone);
    marcador.addEventListener("gmp-click", () => abrirProprio(e));
    marcadoresProprios.push(marcador);
  }
}
function iniciarPainel(ref, nome, origem) {
  const seq = ++sequenciaPainel;
  selecionadoRef = ref;
  minhaAvaliacao = null;
  favoritado = false;
  document.getElementById("painel-restaurante").classList.add("aberto");
  document.getElementById("painel-restaurante").scrollTop = 0;
  document.getElementById("nome-restaurante").textContent = nome;
  document.getElementById("origem-restaurante").textContent = origem;
  Aponte.imagem(document.getElementById("foto-restaurante"), null);
  document.getElementById("creditos-foto").replaceChildren();
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
    seq = iniciarPainel({ id: e.id }, d.nome, "Cadastro próprio do Aponte");
  document.getElementById("endereco-restaurante").textContent =
    Aponte.endereco(d);
  document.getElementById("descricao-propria").textContent = d.descricao;
  document.getElementById("tipo-restaurante").textContent =
    "Estabelecimento de alimentação";
  document.getElementById("telefone-restaurante").textContent =
    "Consulte o estabelecimento";
  document.getElementById("avaliacao-restaurante").textContent =
    "Este cadastro é administrado pelo Aponte.";
  Aponte.imagem(document.getElementById("foto-restaurante"), e.fotoUrl);
  rota(d.nome, d.latitude, d.longitude, null);
  if (map) map.panTo({ lat: Number(d.latitude), lng: Number(d.longitude) });
  await carregarInteracoes({ id: e.id }, seq);
}
async function abrirPainel(restaurante) {
  const ref = { googlePlaceId: restaurante.id },
    seq = iniciarPainel(
      ref,
      restaurante.displayName || "Estabelecimento Google",
      "Google Places",
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
      document.getElementById("avaliacao-restaurante").textContent =
        p.rating != null
          ? `${p.rating}/5 (${p.userRatingCount || 0} avaliações no Google)`
          : "Sem avaliações disponíveis no Google";
      document.getElementById("tipo-restaurante").textContent =
        p.types?.join(", ") || "Não informado";
      Aponte.fotoGoogle(
        p,
        document.getElementById("foto-restaurante"),
        document.getElementById("creditos-foto"),
      );
      if (p.location) {
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
    document.getElementById("resumo-avaliacoes").textContent = resumo.quantidade
      ? `${Number(resumo.media).toFixed(1)}/5 — ${resumo.quantidade} avaliação(ões) do Aponte`
      : "Ainda não há avaliações do Aponte.";
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
    if (seq === sequenciaPainel) Aponte.aviso(e.message, true, "acao-status");
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
    b.disabled = true;
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
      b.disabled = false;
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
document.getElementById("fechar-painel").addEventListener("click", () => {
  document.getElementById("painel-restaurante").classList.remove("aberto");
  ++sequenciaPainel;
});
window.gm_authFailure = () =>
  Aponte.aviso(
    "Não foi possível carregar o Google Maps. Os cadastros próprios continuam disponíveis abaixo.",
    true,
    "mapa-status",
  );
window.initMap = initMap;
