const { test } = require("node:test"),
  assert = require("node:assert/strict");
const u = require("../../src/main/resources/static/js/mapa-exploracao.js");
const centro = { lat: 0, lng: 0 };
function item(chave, origem, lng, nota, quantidade) {
  return {
    chave,
    nome: chave,
    origem,
    coordenadas: { lat: 0, lng },
    nota,
    quantidade,
  };
}
test("Haversine, dateline e coordenadas ausentes/inválidas", () => {
  assert.ok(Math.abs(u.distancia(centro, { lat: 0, lng: 0.01 }) - 1111.95) < 1);
  assert.equal(u.distancia(centro, centro), 0);
  assert.equal(u.coordenadas({ lat: "", lng: "0" }), null);
  assert.equal(u.coordenadas({ lat: 91, lng: 0 }), null);
  assert.equal(u.distancia(centro, null), null);
  assert.ok(
    u.distancia({ lat: 0, lng: 179.999 }, { lat: 0, lng: -179.999 }) < 225,
  );
});
test("raio é máximo e se aplica às duas origens", () => {
  const dados = [
    item("g", "google", 0.01, 4, 5),
    item("a", "aponte", 0.02, 5, 3),
    { ...item("invalido", "aponte", 0, 4, 4), coordenadas: null },
  ];
  assert.equal(u.elegiveis(dados, { centro, raio: 1000 }).length, 0);
  assert.deepEqual(
    u.elegiveis(dados, { centro, raio: 2000 }).map((e) => e.chave),
    ["g"],
  );
  assert.deepEqual(
    u
      .elegiveis(dados, { centro, raio: 5000, origem: "aponte" })
      .map((e) => e.chave),
    ["a"],
  );
});
test("melhor avaliados difere de mais avaliados e valores ausentes ficam por último", () => {
  const itens = [
    item("popular", "google", 0.01, 4, 1000),
    item("melhor", "aponte", 0.02, 5, 3),
    item("sem-nota", "aponte", 0.001, null, 0),
  ];
  assert.equal(
    u.elegiveis(itens, { centro, raio: 5000, ordem: "notas" })[0].chave,
    "melhor",
  );
  assert.equal(
    u.elegiveis(itens, { centro, raio: 5000, ordem: "quantidade" })[0].chave,
    "popular",
  );
  assert.equal(
    u.elegiveis(itens, { centro, raio: 5000, ordem: "proximos" })[0].chave,
    "sem-nota",
  );
});
test("deduplicação visual prefere próprio somente quando ambas origens são exibidas", () => {
  const g = { ...item("g", "google", 0.01, 4, 10), nome: "Café da Praça" },
    a = { ...item("a", "aponte", 0.0101, 5, 2), nome: "Cafe da Praca" };
  assert.deepEqual(
    u.elegiveis([g, a], { centro, raio: 2000 }).map((e) => e.chave),
    ["a"],
  );
  assert.deepEqual(
    u
      .elegiveis([g, a], { centro, raio: 2000, origem: "google" })
      .map((e) => e.chave),
    ["g"],
  );
});
test("empates independem da ordem de chegada e o retângulo não substitui o recorte circular", () => {
  const a = item("b", "google", 0.01, 4, 10),
    b = item("a", "google", 0.01, 4, 10);
  assert.deepEqual(
    u.elegiveis([a, b], { centro, raio: 2000 }).map((e) => e.chave),
    u.elegiveis([b, a], { centro, raio: 2000 }).map((e) => e.chave),
  );
  const limites = u.limites(centro, 2000);
  assert.ok(limites.north > 0 && limites.south < 0);
  assert.equal(
    u.elegiveis(
      [item("canto", "google", limites.east, 4, 4)].map((e) => ({
        ...e,
        coordenadas: { lat: limites.north, lng: limites.east },
      })),
      { centro, raio: 2000 },
    ).length,
    0,
  );
});
