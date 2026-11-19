# Aponte

Aplicação Java 17 / Spring Boot 4.1.1 com páginas Thymeleaf, APIs de sessão, mapa Google Places + cadastros próprios, favoritos, avaliações, cardápios e administração.

## Executar

1. Disponibilize MySQL 8 e um banco próprio para o Aponte.
2. Para um banco **novo e vazio**, revise e execute manualmente `docs/SCHEMA_NOVO.sql`. Para banco existente, faça backup e confira as migrações em `docs/MIGRACAO_SERVICE.sql` e `docs/MIGRACAO_CONTROLLERS.sql` e `docs/MIGRACAO_MODERNIZACAO.sql`; não execute o esquema inicial sobre dados existentes. O Hibernate usa `validate`, sem executar migrações.
3. Configure o ambiente (exemplo Bash; os valores de senha devem ser definidos por você):

```bash
export DB_URL='jdbc:mysql://localhost:3306/aponte'
export DB_USERNAME='aponte'
read -r -s -p 'Senha do MySQL: ' DB_PASSWORD; export DB_PASSWORD; echo
export GOOGLE_MAPS_API_KEY='sua-chave-de-navegador'
export GOOGLE_MAPS_MAP_ID='seu-map-id' # DEMO_MAP_ID é o padrão de desenvolvimento
export APONTE_UPLOADS_DIR='/caminho/absoluto/gravavel/fotos-aponte'
bash ./mvnw spring-boot:run
```

No PowerShell, use `$env:NOME_DA_VARIAVEL = 'valor'` e `./mvnw.cmd spring-boot:run`. Não versione credenciais. A pasta de fotografias deve persistir entre reinícios e ser incluída no backup junto ao banco.

O login Google é opcional: configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` e autorize o callback `http://localhost:8080/login/oauth2/code/google` no Google Cloud. Contas locais existentes precisam entrar com senha e confirmar a vinculação no perfil; não há associação automática por e-mail. Sem as duas credenciais, o login local funciona e a área Google informa a indisponibilidade.

Abra <http://localhost:8080>. Cadastre-se em `/forma.html`, entre em `/entra.html` e use `/map.html`, `/perfil.html` ou `/favoritos.html`. A pesquisa Google requer Maps JavaScript API e Places API (New) habilitadas, faturamento e restrições de referenciador adequadas à origem utilizada. Sem a chave/SDK, os cadastros próprios continuam acessíveis, inclusive por pesquisa local; o sistema não inventa resultados Google.

## Administrador inicial

O provisionamento é opcional e desabilitado por padrão. Em uma inicialização controlada, além das variáveis acima:

```bash
export APONTE_ADMIN_BOOTSTRAP_ENABLED=true
export APONTE_ADMIN_NOME='gestor'
read -r -s -p 'Nova senha administrativa (mín. 12 caracteres): ' APONTE_ADMIN_SENHA
export APONTE_ADMIN_SENHA; echo
bash ./mvnw spring-boot:run
```

Entre com `admin:gestor` e essa senha. Uma conta existente com o mesmo nome não tem sua senha redefinida. Depois do primeiro provisionamento, desative a flag e remova a senha de bootstrap do ambiente. Não há criação de administradores por requisição pública nem senha administrativa padrão.

Em `/admin`, consulte indicadores reais; em `/admin/usuarios`, mantenha usuários; em `/admin/estabelecimentos`, cadastre/edite estabelecimentos próprios, envie fotos e gerencie cardápios e avaliações. Para definir a localização, clique no mapa do formulário ou informe latitude/longitude. Cadastros próprios aparecem no mapa público e na lista correspondente.

## Testes

```bash
bash ./mvnw clean verify
```

Os testes padrão usam H2 em memória, sem alterar o MySQL. Os testes HTTP também foram executados sobre um MySQL 8.4 isolado com esquema manual e `ddl-auto=validate`.

Os testes reproduzíveis de navegador estão em `tests/browser`. Execute somente com aplicação e banco isolados:

```bash
cd tests/browser
npm ci
npx playwright install chromium
export BASE_URL='http://localhost:8080'
export APONTE_E2E_BANCO_ISOLADO=SIM
export APONTE_E2E_ADMIN_LOGIN='admin:gestor'
read -r -s -p 'Senha administrativa do ambiente de testes: ' APONTE_E2E_ADMIN_SENHA
export APONTE_E2E_ADMIN_SENHA; echo
npm test
npm run test:mapa
npm run test:modernizacao
# Diagnóstico externo opcional, sem simulação e com TLS verificado:
npm run test:google
```

`npm test` usa o site real e suas APIs. `test:mapa` substitui explicitamente o SDK Google para verificar o contrato do mapa híbrido; não comprova acesso à API Google real. Os testes criam registros próprios e contas temporárias; mantenha o banco separado de dados reais. Os artefatos locais ficam em `tests/browser/artifacts`, ignorados pelo Git. Opcionalmente indique `CHROMIUM_EXECUTABLE_PATH` para um Chromium instalado.

**[Relatório da modernização, migração, OAuth2 e testes atuais](docs/MODERNIZACAO.md)**.

[Relatório histórico de arquitetura, endpoints, páginas, fotos, banco, validação e execução](docs/INTEGRACAO.md). O relatório histórico dos Services está em [docs/SERVICES.md](docs/SERVICES.md).
