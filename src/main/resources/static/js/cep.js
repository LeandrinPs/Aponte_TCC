
document.addEventListener("DOMContentLoaded", () => {

    const campoCep = document.getElementById("cep");

    if (!campoCep) return;

    campoCep.addEventListener("input", () => {

        // Mantém somente os números
        let cep = campoCep.value.replace(/\D/g, "");

        // Limita a 8 dígitos
        campoCep.value = cep.slice(0, 8);

        // Consulta somente quando tiver 8 números
        if (cep.length === 8) {
            buscarCep(cep);
        }

    });

});

async function buscarCep(cep) {

    const rua = document.getElementById("rua");
    const bairro = document.getElementById("bairro");
    const cidade = document.getElementById("cidade");
    const estado = document.getElementById("estado");

    try {

        const response = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

        if (!response.ok) {
            throw new Error("Erro na consulta do CEP.");
        }

        const dados = await response.json();

        if (dados.erro) {
            alert("CEP não encontrado.");
            return;
        }

        // Preenche automaticamente os campos
        rua.value = dados.logradouro || "";
        bairro.value = dados.bairro || "";
        cidade.value = dados.localidade || "";
        estado.value = dados.uf || "";

    } catch (error) {

        console.error("Erro ao buscar CEP:", error);

    }

}

function configurarCoordenadas(id) {

    const campo = document.getElementById(id);

    if (!campo) return;

    campo.addEventListener("input", () => {

        // Permite somente números, ponto e sinal negativo
        let valor = campo.value.replace(/[^0-9.-]/g, "");

        // Permite somente um sinal negativo no início
        valor = valor.replace(/-/g, "");

        if (campo.value.startsWith("-")) {
            valor = "-" + valor;
        }

        // Permite somente um ponto decimal
        const partes = valor.split(".");

        if (partes.length > 2) {
            valor = partes[0] + "." + partes.slice(1).join("");
        }

        campo.value = valor;
    });
}

configurarCoordenadas("latitude");
configurarCoordenadas("longitude");