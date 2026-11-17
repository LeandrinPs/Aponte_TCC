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
    mapId: "9931383d58e7742579ec3929",
    clickableIcons: true,
  });
  window.map = map;

  await configurarPlaceAutocomplete();

  // Botão de localização
  const locationButton = document.createElement("button");
  locationButton.textContent = "Minha localização";
  locationButton.classList.add("custom-map-control-button");
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
  locationButton.addEventListener("click", obterLocalizacao);

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

  // Fechar painel
  document.getElementById("fechar-painel").addEventListener("click", () => {
    document.getElementById("painel-restaurante").classList.remove("aberto");
  });
}

// GOOGLE PLACE AUTOCOMPLETE
async function configurarPlaceAutocomplete() {

    // Localiza o container HTML
    const container = document.getElementById(
        "autocomplete-container"
    );

    if (!container) {
        console.error("Container do Autocomplete não encontrado.");
        return;
    }

    try {

        // Importa a biblioteca Places
        const { PlaceAutocompleteElement } =
            await google.maps.importLibrary("places");

        // Cria o componente
        autocompleteRestaurantes =
            new PlaceAutocompleteElement({

                includedPrimaryTypes: [
                    "restaurant",
                    "cafe",
                    "bakery",
                    "bar",
                    "meal_takeaway"
                ],

                includedRegionCodes: ["br"],

                requestedLanguage: "pt-BR",

                requestedRegion: "BR",

                noInputIcon: true
            });

        // Configura o campo
        autocompleteRestaurantes.placeholder =
            "Pesquisar estabelecimentos...";

        // Insere no HTML
        container.replaceChildren(autocompleteRestaurantes);

        // Botão da lupa (caso exista no HTML)
        const botaoPesquisa = document.getElementById(
            "btn-foco-autocomplete"
        );

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
        autocompleteRestaurantes.addEventListener(
            "gmp-select",
            async (event) => {

                try {

                    const restaurante =
                        event.placePrediction.toPlace();

                    console.log(
                        "Estabelecimento selecionado:",
                        restaurante.id
                    );

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

                            title: restaurante.displayName ||
                                "Estabelecimento selecionado",

                            gmpClickable: true

                        });

                    }

                } catch (erro) {

                    console.error(
                        "Erro ao selecionar estabelecimento:",
                        erro
                    );

                }

            }
        );

        console.log(
            "Place Autocomplete inicializado com sucesso!"
        );

    } catch (erro) {

        console.error(
            "Erro ao inicializar Place Autocomplete:",
            erro
        );

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
      const { AdvancedMarkerElement } = await google.maps.importLibrary(
        "marker"
      );
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
        "Não foi possível obter sua localização. Verifique a permissão de localização do navegador."
      );
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
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

      includedTypes: ["restaurant"],

      maxResultCount: 10,

      rankPreference: SearchNearbyRankPreference.DISTANCE,
    });

    // Remove marcadores anteriores

    marcadores.forEach((marcador) => {
      marcador.map = null;
    });

    marcadores = [];

    if (!places || places.length === 0) {
      alert("Nenhum restaurante encontrado.");

      return;
    }

    // Cria marcadores

    places.forEach((restaurante) => {
      if (!restaurante.location) return;

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

    alert("Erro ao buscar restaurantes. Verifique o console.");
  }
}

// ABRIR PAINEL DO RESTAURANTE

async function abrirPainel(restaurante) {
  const painel = document.getElementById("painel-restaurante");

  const nome = document.getElementById("nome-restaurante");

  const endereco = document.getElementById("endereco-restaurante");

  const telefone = document.getElementById("telefone-restaurante");

  const site = document.getElementById("site-restaurante");

  const horarios = document.getElementById("horarios-restaurante");

  const avaliacao = document.getElementById("avaliacao-restaurante");

  const tipo = document.getElementById("tipo-restaurante");

  painel.classList.add("aberto");

  // Limpa dados anteriores

  nome.textContent = restaurante.displayName || "Restaurante";

  endereco.textContent =
    restaurante.formattedAddress || "Endereço não disponível";

  telefone.textContent = "Carregando...";

  telefone.removeAttribute("href");

  site.hidden = true;

  horarios.replaceChildren();

  avaliacao.textContent = "Carregando...";

  tipo.textContent = "Carregando...";

  if (restaurante.location) {
    map.panTo(restaurante.location);
  }

  try {
    // Busca detalhes adicionais

    if (typeof restaurante.fetchFields === "function") {
      await restaurante.fetchFields({
        fields: [
          "displayName",
          "formattedAddress",
          "location",
          "nationalPhoneNumber",
          "regularOpeningHours",
          "websiteURI",
          "rating",
          "userRatingCount",
          "types",
        ],
      });
    }

    // Nome e endereço

    nome.textContent = restaurante.displayName || "Restaurante";

    endereco.textContent =
      restaurante.formattedAddress || "Endereço não disponível";

    // Telefone

    if (restaurante.nationalPhoneNumber) {
      telefone.textContent = restaurante.nationalPhoneNumber;

      telefone.href =
        "tel:" + restaurante.nationalPhoneNumber.replace(/[^\d+]/g, "");
    } else {
      telefone.textContent = "Telefone não informado";
    }

    // Site oficial

    if (restaurante.websiteURI) {
      try {
        const urlSite = new URL(restaurante.websiteURI);
        site.textContent = urlSite.hostname;
        site.href = urlSite.href;
        site.target = "_blank";
        site.rel = "noopener noreferrer";
        site.title = "Acessar site oficial";
        site.hidden = false;
      } catch (erro) {
        console.error("Erro ao identificar o site:", erro);

        site.textContent = "Site oficial indisponível";
        site.removeAttribute("href");

        site.hidden = false;
      }
    } else {
      site.textContent = "Este estabelecimento não possui site oficial.";

      site.removeAttribute("href");
      site.removeAttribute("target");

      site.hidden = false;
    }

    // Horários

    horarios.replaceChildren();

    const listaHorarios =
      restaurante.regularOpeningHours?.weekdayDescriptions || [];

    if (listaHorarios.length > 0) {
      listaHorarios.forEach((horario) => {
        const item = document.createElement("li");

        item.textContent = horario;

        horarios.appendChild(item);
      });
    } else {
      const item = document.createElement("li");

      item.textContent = "Horário não informado";

      horarios.appendChild(item);
    }

    // Avaliação

    avaliacao.textContent =
      restaurante.rating != null
        ? `${restaurante.rating} / 5 (${
            restaurante.userRatingCount || 0
          } avaliações)`
        : "Sem avaliações disponíveis";

    tipo.textContent = restaurante.types?.join(", ") || "Não informado";
  } catch (erro) {
    console.error("Erro ao carregar detalhes do restaurante:", erro);

    telefone.textContent = "Telefone não disponível";

    avaliacao.textContent = "Sem avaliações disponíveis";

    tipo.textContent = "Não informado";
  }
}

// Inicialização do mapa

window.initMap = initMap;
