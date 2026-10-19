
const passwordIcon = document.querySelector('.passwordIcon');
const passwordInput = document.querySelector('#password');
passwordIcon.addEventListener('click', function () {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';

        passwordIcon.classList.add('fa-eye');
        passwordIcon.classList.remove('fa-eye-slash');

    } else {
        passwordInput.type = 'password';

        passwordIcon.classList.add('fa-eye-slash');
        passwordIcon.classList.remove('fa-eye');
    }
});


/*Função de ver a data atual */

function getDataAtual() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');



    return `${ano}-${mes}-${dia}`;
}
document.addEventListener("DOMContentLoaded", function () {

    const inputData = document.getElementById("birthdate");

    if (inputData) {
        inputData.max = getDataAtual();
    }

});

/*Função de verificar o dominio do Email */

const inputEmail = document.getElementById("email");

function verificarDominioEmail(email, callback) {
  const dominio = email.split('@')[1];
  
  if (!dominio) {
    return callback(false);
  }

  dns.resolveMx(dominio, (err, addresses) => {
    if (err || !addresses || addresses.length === 0) {
      // Domínio não tem servidores de e-mail válidos
      return callback(false);
    }
    // Domínio válido com servidores MX configurados
    return callback(true);
  });
}



