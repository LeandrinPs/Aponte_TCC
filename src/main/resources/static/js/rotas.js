
let Route;
let polylinesAtuais = [];
let calculoAtual = 0;

// CARREGAR BIBLIOTECA DE ROTAS
async function carregarBibliotecaRotas() {
    if (!Route) {
        const biblioteca = await google.maps.importLibrary("routes");
        Route = biblioteca.Route;
    }
}


// CALCULAR ROTA
async function calcularRota(modo, botao = null) {

    const numeroCalculo = ++calculoAtual;

    const origem = window.localizacaoUsuario;
    const destino = window.destinoRota;
    const mapa = window.map;

 const painel = document.querySelector(".rotas-card");
const lista = document.getElementById("instrucoes-rota");

const tempo = document.getElementById("tempo-rota");
const distancia = document.getElementById("distancia-rota");
const icone = document.getElementById("icone-transporte");

// Verifica se os elementos necessários existem
const elementosAusentes = [];

if (!painel) elementosAusentes.push(".rotas-card");
if (!lista) elementosAusentes.push("#instrucoes-rota");
if (!tempo) elementosAusentes.push("#tempo-rota");
if (!distancia) elementosAusentes.push("#distancia-rota");
if (!icone) elementosAusentes.push("#icone-transporte");

if (elementosAusentes.length > 0) {
    console.error(
        "Elementos não encontrados no HTML:",
        elementosAusentes
    );
    return;
}

    console.log("Calculando rota:", modo);
    console.log("Origem:", origem);
    console.log("Destino:", destino);

    // Verifica a localização
    if (!origem) {
        lista.textContent = "Permita o acesso à sua localização primeiro.";
        return;
    }

    // Verifica o estabelecimento
    if (!destino) {
        lista.textContent = "Selecione um estabelecimento no mapa.";
        return;
    }

    // Verifica o mapa
    if (!mapa) {
        lista.textContent = "O mapa ainda não foi inicializado.";
        return;
    }

    try {

        painel.classList.add("carregando");

        tempo.textContent = "Calculando...";
        distancia.textContent = "Aguarde";

        lista.textContent = "Buscando melhor trajeto...";

        // Atualiza botão selecionado
        document.querySelectorAll(".rota-opcao").forEach(b => {
            b.classList.remove("active");
        });

        if (botao) {
            botao.classList.add("active");
        }

        // Carrega Routes API
        await carregarBibliotecaRotas();

        // Remove rota anterior
        polylinesAtuais.forEach(linha => {
            linha.setMap(null);
        });

        polylinesAtuais = [];

        // Solicitação
        const resultado = await Route.computeRoutes({

            origin: origem,

            destination: destino,

            travelMode: modo,

            language: "pt-BR",

            fields: [
                "path",
                "distanceMeters",
                "durationMillis",
                "legs"
            ]

        });

        // Evita resultado antigo substituir o atual
        if (numeroCalculo !== calculoAtual) return;

        if (!resultado.routes || resultado.routes.length === 0) {
            throw new Error("Nenhuma rota encontrada.");
        }

        const rota = resultado.routes[0];

        // DESENHAR ROTA NO MAPA
        polylinesAtuais = rota.createPolylines();

        polylinesAtuais.forEach(linha => {

            linha.setOptions({
                strokeColor: "#00AAA9",
                strokeOpacity: 0.95,
                strokeWeight: 6
            });

            linha.setMap(mapa);

        });

        // AJUSTAR MAPA
        const limites = new google.maps.LatLngBounds();

        rota.path.forEach(ponto => {
            limites.extend(ponto);
        });

        mapa.fitBounds(limites);

        // DISTÂNCIA
        const km = (rota.distanceMeters / 1000).toFixed(1);

        distancia.textContent = km.replace(".", ",") + " km";

        // TEMPO
        const minutos = Math.ceil(rota.durationMillis / 60000);

        if (minutos >= 60) {

            const horas = Math.floor(minutos / 60);
            const resto = minutos % 60;

            tempo.textContent = resto > 0
                ? `${horas} h ${resto} min`
                : `${horas} h`;

        } else {

            tempo.textContent = minutos + " min";

        }

        // ÍCONE DO TRANSPORTE
        const icones = {
            DRIVING: "bi-car-front-fill",
            BICYCLING: "bi-bicycle",
            WALKING: "bi-person-walking",
            TRANSIT: "bi-bus-front-fill",
            TWO_WHEELER: "bi-bus-front-fill"
        };

        document.getElementById("icone-transporte").className =
            "bi " + (icones[modo] || "bi-sign-turn-right");

        // INSTRUÇÕES DO TRAJETO
        lista.replaceChildren();

        const etapas = (rota.legs || [])
            .flatMap(perna => perna.steps || []);

        etapas.forEach(passo => {

            const item = document.createElement("li");

            item.textContent =
                passo.instructions || "Continue pelo trajeto indicado.";

            lista.appendChild(item);

        });

        if (etapas.length === 0) {

            const item = document.createElement("li");

            item.textContent = "Instruções detalhadas indisponíveis.";

            lista.appendChild(item);

        }

        // Aviso para caminhada e bicicleta
        if (modo === "WALKING" || modo === "BICYCLING") {

            const aviso = document.createElement("li");

            aviso.textContent =
                "Confira se o trajeto é adequado e seguro antes de iniciar.";

            aviso.classList.add("text-muted");

            lista.appendChild(aviso);

        }

        console.log("Rota calculada com sucesso:", rota);

    } catch (erro) {

        if (numeroCalculo !== calculoAtual) return;

        console.error("Erro ao calcular rota:", erro);

        tempo.textContent = "--";
        distancia.textContent = "--";

        lista.textContent =
            "Não foi possível calcular este trajeto. Tente outra modalidade.";

    } finally {

        if (numeroCalculo === calculoAtual) {
            painel.classList.remove("carregando");
        }

    }
}


// REGISTRAR CLIQUES DOS QUATRO BOTÕES
function conectarBotoesRotas() {

    const botoes = document.querySelectorAll(".rota-opcao");

    console.log("Botões encontrados:", botoes.length);

    botoes.forEach(botao => {

        botao.addEventListener("click", () => {

            const modo = botao.dataset.modo;

            console.log("Botão clicado:", modo);

            calcularRota(modo, botao);

        });

    });

}


// LIMPAR ROTA
function limparRota() {

    calculoAtual++;

    // Remove as linhas do mapa
    polylinesAtuais.forEach(linha => {
        linha.setMap(null);
    });

    polylinesAtuais = [];

    // Reseta o tempo
    const tempo = document.getElementById("tempo-rota");

    if (tempo) {
        tempo.textContent = "--";
    }

    // Reseta a distância
    const distancia = document.getElementById("distancia-rota");

    if (distancia) {
        distancia.textContent = "--";
    }

    // Reseta as instruções
    const lista = document.getElementById("instrucoes-rota");

    if (lista) {
        lista.replaceChildren();

        const item = document.createElement("li");

        item.textContent =
            "Selecione um meio de transporte para calcular a rota.";

        lista.appendChild(item);
    }

    console.log("Rota removida.");


document.addEventListener("DOMContentLoaded", () => {

    const botoes = document.querySelectorAll(".rota-opcao");

    botoes.forEach(botao => {

        botao.addEventListener("click", () => {

            botoes.forEach(b => b.classList.remove("active"));

            botao.classList.add("active");

            const modo = botao.dataset.modo;

            calcularRota(modo, botao);

        });

    });

});

}