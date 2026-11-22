// Substituto explícito do SDK para testes de contrato. Não valida Google Maps real.
module.exports = async function configurar(context, fixtures) {
  await context.addInitScript((f) => {
    window.__consultas = [];
    window.__marcadores = [];
    window.__detalhes = 0;
    class LatLng {
      constructor(p) {
        this.p = p;
      }
      lat() {
        return this.p.lat;
      }
      lng() {
        return this.p.lng;
      }
    }
    class Mapa {
      constructor(n, o) {
        this.element = n;
        this.center = new LatLng(o.center);
        this.controls = { TOP_CENTER: [] };
        this.listeners = {};
        n.replaceChildren();
        n.style.position = "relative";
        n.style.overflow = "hidden";
        n.style.background =
          "repeating-linear-gradient(35deg,#e9eff0 0 65px,#d6e0e3 65px 80px,#edf1f1 80px 155px)";
        const l = document.createElement("span");
        l.textContent = "SDK Google simulado — teste de contrato";
        l.style.cssText =
          "position:absolute;right:12px;bottom:12px;font-size:12px;color:#586b72";
        n.append(l);
        const c = document.createElement("div");
        c.style.cssText =
          "position:absolute;top:0;left:10px;z-index:8;display:flex";
        n.append(c);
        this.controls.TOP_CENTER.push = (b) => {
          c.append(b);
          return 1;
        };
      }
      addListener(n, fn) {
        this.listeners[n] = fn;
      }
      panTo(p) {
        this.center = typeof p.lat === "function" ? p : new LatLng(p);
      }
      setCenter(p) {
        this.panTo(p);
      }
      getCenter() {
        return this.center;
      }
      getBounds() {
        return {};
      }
      setZoom() {}
      fitBounds() {
        this.ajustouRaio = true;
      }
    }
    class Marcador {
      constructor(o) {
        Object.assign(this, o);
        this.listeners = {};
        this.node = document.createElement("div");
        this.node.style.cssText = "position:absolute;left:50%;top:45%";
        this._map = null;
        this.map = o.map;
        window.__marcadores.push(this);
      }
      set map(v) {
        this._map = v;
        if (this.node) {
          if (v) {
            v.element.append(this.node);
            const pos = this.position?.p || this.position || {};
            this.node.style.left =
              50 + ((pos.lng ?? f.centro.lng) - f.centro.lng) * 2000 + "%";
            this.node.style.top =
              50 + ((pos.lat ?? f.centro.lat) - f.centro.lat) * 2000 + "%";
          } else this.node.remove();
        }
      }
      get map() {
        return this._map;
      }
      append(n) {
        this.content = n;
        this.node.append(n);
      }
      replaceChildren(n) {
        this.node.replaceChildren(n);
        this.content = n;
      }
      querySelector(s) {
        return this.node.querySelector(s);
      }
      addEventListener(n, fn) {
        this.listeners[n] = fn;
        this.node.onclick = fn;
      }
    }
    class Autocomplete extends HTMLElement {}
    customElements.define("exploracao-autocomplete-fixture", Autocomplete);
    const tipos = {
      italiana: ["italian_restaurant"],
      mexicana: ["mexican_restaurant"],
      chinesa: ["chinese_restaurant"],
      vegetariana: ["vegetarian_restaurant"],
      "frutos-do-mar": ["seafood_restaurant"],
      docerias: ["dessert_shop", "confectionery"],
    };
    const dadosBase = [
      {
        id: "G-Perto",
        nome: "Almoço Google Perto",
        delta: 0.004,
        nota: 3.5,
        n: 200,
      },
      {
        id: "G-Melhor",
        nome: "Almoço Google Melhor",
        delta: 0.013,
        nota: 4.9,
        n: 5,
      },
      {
        id: "G-Popular",
        nome: "Almoço Google Popular",
        delta: 0.025,
        nota: 4,
        n: 1200,
      },
      {
        id: "G-Longe",
        nome: "Almoço Google Longe",
        delta: 0.08,
        nota: 4.8,
        n: 90,
      },
      {
        id: "G-Duplicado",
        nome: f.duplicado,
        delta: 0.0030001,
        nota: 5,
        n: 900,
      },
    ];
    function registros(request) {
      const cat = Object.entries(tipos).find(([, ts]) =>
        ts.some(
          (t) =>
            request.includedTypes?.includes(t) || request.includedType === t,
        ),
      );
      const textoDoce = request.textQuery?.toLowerCase().includes("doce");
      if (cat || textoDoce) {
        const [chave, ts] = cat || ["docerias", tipos.docerias];
        return ts.map((tipo, i) => ({
          id: "G-" + chave + "-" + i,
          nome: chave === "docerias" ? "Doce Google " + i : "Google " + chave,
          delta: 0.006,
          nota: 4.5,
          n: 20,
          tipo,
        }));
      }
      return dadosBase;
    }
    class Place {
      constructor(o) {
        this.id = o.id;
        const d = o.d ||
          dadosBase.find((d) => d.id === o.id) || {
            nome: "Google selecionado",
            delta: 0.004,
            nota: 4.2,
            n: 10,
          };
        this.displayName = d.nome;
        this.primaryType = d.tipo || "pizza_restaurant";
        this.types = [
          this.primaryType,
          "restaurant",
          "food",
          "point_of_interest",
        ];
        this.primaryTypeDisplayName = "Categoria Google";
        this.location = new LatLng({
          lat: f.centro.lat,
          lng: f.centro.lng + d.delta,
        });
        this.rating = d.nota;
        this.userRatingCount = d.n;
        this.formattedAddress = "Endereço efêmero da fixture";
        this.photos = [
          {
            getURI: () => "/img/Asador.jpg",
            authorAttributions: [
              { displayName: "Autor simulado", uri: "https://example.test" },
            ],
          },
        ];
      }
      async fetchFields() {
        window.__detalhes++;
      }
      static async searchNearby(r) {
        window.__consultas.push({ tipo: "nearby", ...r });
        return { places: registros(r).map((d) => new Place({ id: d.id, d })) };
      }
      static async searchByText(r) {
        window.__consultas.push({ tipo: "texto", ...r });
        return { places: registros(r).map((d) => new Place({ id: d.id, d })) };
      }
    }
    window.google = {
      maps: {
        Map: Mapa,
        ControlPosition: { TOP_CENTER: "TOP_CENTER" },
        importLibrary: async (n) =>
          n === "marker"
            ? { AdvancedMarkerElement: Marcador }
            : {
                Place,
                PlaceAutocompleteElement: Autocomplete,
                SearchNearbyRankPreference: { DISTANCE: "DISTANCE" },
              },
      },
    };
  }, fixtures);
  await context.route("https://maps.googleapis.com/**", (r) => r.abort());
};
