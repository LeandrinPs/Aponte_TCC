
const painel = document.getElementById("painel-restaurante");

document.getElementById("abrir-painel").addEventListener("click", () => {
    painel.classList.add("aberto");
});

document.getElementById("fechar-painel").addEventListener("click", () => {
    painel.classList.remove("aberto");
});
