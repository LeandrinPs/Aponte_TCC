async function initAutocompleteInicio() {
  const container = document.getElementById("autocomplete-container");

  if (!container) {
    console.error("Container de pesquisa não encontrado.");
    return;
  }

  try {
    const { PlaceAutocompleteElement } =
      await google.maps.importLibrary("places");

    const autocomplete = new PlaceAutocompleteElement({
      includedRegionCodes: ["br"],
      includedPrimaryTypes: [
        "restaurant",
        "cafe",
        "bakery",
        "bar",
        "meal_takeaway",
      ],
    });

    autocomplete.placeholder = "Pesquisar estabelecimentos...";

    autocomplete.noInputIcon = true;

    container.replaceChildren(autocomplete);
    document
      .getElementById("btn-foco-autocomplete")
      ?.addEventListener("click", () => autocomplete.focus());

    // Ao selecionar um estabelecimento
    autocomplete.addEventListener("gmp-select", ({ placePrediction }) => {
      const restaurante = placePrediction.toPlace();

      console.log("Restaurante selecionado:", restaurante.id);

      // Encaminha para o mapa
      window.location.href =
        "map.html?placeId=" + encodeURIComponent(restaurante.id);
    });

    window.atualizarFeedGoogle?.();
    window.atualizarFotosFavoritos?.();
  } catch (erro) {
    console.error("Erro no Autocomplete:", erro);
  }
}

// Callback global do Google Maps
window.initAutocompleteInicio = initAutocompleteInicio;
