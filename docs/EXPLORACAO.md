# Exploração do mapa e administração — 22/11/2026

## Base e escopo preservado

A implementação parte da `master` `36df38a` (PR #4 já incorporado), preservando as alterações posteriores de MySQL e `cep.js`. Não refaz login, OAuth2, perfil, favoritos, avaliações, galeria, Cardápio ou a identidade visual. Os emojis existentes dos links superiores não foram removidos nem recolocados; os seis links novos usam texto sem emojis. Não foi adicionada categoria Vegana.

## Funcionalidades e decisões

### Página inicial

O Controller escolhe uma das quatro fotografias existentes antes de renderizar o HTML: `imagem.jpeg`, `Asador.jpg`, `lasai.jpg` ou `maido.jpeg`. A escolha chega por uma variável CSS da seção `hero-aponte`, mantendo texto, botões, cabeçalho, overlay escuro e posições. Não há script de troca, timer, carrossel, animação ou alteração após o primeiro paint. A mesma foto pode ser escolhida em cargas consecutivas. Não foram baixadas fotos do Places nem adicionadas imagens externas. O arquivo existente `Quinto.jpg` (12 MB) foi preservado, mas não participa da seleção para evitar esse custo de carregamento.

### Uma coluna para exploração e detalhes

A coluna esquerda tem a lista de resultados e três controles: distância máxima, ordenação e origem. O seletor separado de cadastros próprios foi substituído pela lista; não há segunda barra lateral nem seletor interno de categorias. Selecionar um resultado ou marcador abre o painel escuro existente no mesmo espaço. O botão “Voltar aos resultados” restaura a lista, a posição de rolagem e os filtros, sem iniciar nova pesquisa.

Continuam disponíveis detalhes, galeria/créditos, notas Google e Aponte separadas, favoritos, avaliações, Cardápio e rotas. A categoria superior e a pesquisa textual continuam sendo respeitadas. O mapa Google permanece à direita em desktop; em celular fica acima da coluna de resultados/detalhes, com rolagem acessível. Os cadastros próprios elegíveis podem ser consultados mesmo quando o SDK não carrega.

### Distância, ordenação e origem

- **Distância:** 1, 2, 5 ou 10 km, padrão 2 km, a partir do centro da pesquisa. O usuário pode pesquisar na área atual do mapa ou utilizar Minha localização com autorização do navegador. Geolocalização não é exigida na abertura.
- **Raio máximo:** Nearby recebe o círculo com o raio selecionado. Text Search aceita restrição retangular, por isso a resposta é recortada novamente pelo círculo. Os próprios e resultados Google passam pelo mesmo cálculo Haversine. Coordenadas ausentes/inválidas são excluídas do raio, com aviso, sem marcadores inválidos ou distâncias inventadas.
- **Ordenação:** distância crescente, nota decrescente ou quantidade decrescente. Google usa `rating`/`userRatingCount`; próprios usam agregação real das avaliações Aponte. Não há média combinada. Empates usam distância, nome e identificador estável; valores ausentes ficam depois dos conhecidos na métrica escolhida. Os resultados indicam a plataforma da nota.
- **Origem:** Todos, Google ou Aponte, afetando lista e marcadores personalizados. Referências Google persistidas para vínculos não são tratadas como próprios. No modo Todos, a deduplicação visual existente prefere o próprio quando nome normalizado e posição próxima indicam equivalência. No modo Google, o correspondente Google permanece visível.

O limite Google foi ajustado de 10 para 20 por consulta, dentro do contrato da API. A interface informa que ordena somente os resultados encontrados e que a lista não é um ranking completo da cidade. O Nearby obtém uma amostra por distância; ordenar essa amostra por nota não transforma a busca em um ranking global.

Ordenação e origem são aplicadas localmente. Buscas equivalentes podem reutilizar até oito respostas em memória por dois minutos, sem persistir dados Google no banco ou no navegador. Fotografias da lista reutilizam o URI durante a visualização. Alterações rápidas de busca e atualizações de tabelas têm controle de sequência para que respostas antigas não sobrescrevam o estado mais novo.

### Categorias e pinos

O menu Mais mantém Brasileira e acrescenta Italiana, Mexicana, Chinesa, Vegetariana, Frutos do mar e Docerias. O mesmo catálogo alimenta categorias, tags e ícones administrativos e as funções de correspondência/classificação. Os novos valores cabem nas colunas existentes. Registros sem classificação continuam funcionando e aparecendo na busca sem categoria.

| Categoria | Tipos Google usados |
|---|---|
| Italiana | `italian_restaurant` |
| Mexicana | `mexican_restaurant` |
| Chinesa | `chinese_restaurant` |
| Vegetariana | `vegetarian_restaurant` |
| Frutos do mar | `seafood_restaurant` |
| Docerias | `dessert_shop`, `dessert_restaurant`, `confectionery`, `candy_store`, `chocolate_shop`, `ice_cream_shop`, `pastry_shop`, `cake_shop`, `donut_shop` |

Nearby permite a união de tipos numa consulta. Text Search admite somente um `includedType`; quando a categoria reúne vários tipos, a consulta textual usa a restrição geográfica e a resposta é filtrada localmente pelos tipos da categoria, sem enviar um parâmetro inválido. Esse recorte continua sujeito ao limite dos resultados retornados, explicitado na interface.

Os tipos e parâmetros foram conferidos na [tabela oficial de tipos](https://developers.google.com/maps/documentation/places/web-service/place-types) e na [referência JavaScript de Place](https://developers.google.com/maps/documentation/javascript/reference/place). `rating` e `userRatingCount` podem elevar a consulta ao SKU Enterprise; a máscara contém os campos necessários, sem `*`. Consulte a [documentação de campos e cobrança de Nearby](https://developers.google.com/maps/documentation/javascript/nearby-search) ao estimar custos/quota.

Os pinos usam `AdvancedMarkerElement` com SVG estático, área interna clara e símbolo da categoria. Google é amarelo `#F2B705`, Aponte vermelho `#DC3545`; o ícone manual do administrador é respeitado. A âncora horizontal fica em -50% e a vertical em -100%, posicionando a ponta nas coordenadas. Hover/seleção ampliam a partir da ponta e mantêm o clique; a localização do usuário continua azul e distinta. Pontos nativos do mapa-base não foram alterados.

### Administração e exclusões

A listagem separa Cadastros próprios de Referências Google. Próprios mantêm edição, fotos e conteúdos; referências mostram origem/Place ID, mapa e manutenção de conteúdo Aponte, sem editar dados Google ou oferecer exclusão de cadastro próprio. A descrição esclarece que não é uma importação de todos os resultados do Google.

A investigação cobriu exclusão de usuários sem vínculos, somente favoritos, somente avaliações e ambos, verificando dados de outra conta. **Não foi reproduzida falha de persistência nas exclusões permitidas.** Os próprios com favoritos, avaliações ou Cardápio são bloqueados pela regra já existente. A mensagem genérica foi substituída pela lista e quantidade dos vínculos que impedem a operação. A proteção foi mantida e é revalidada no DELETE definitivo.

Foi acrescentada uma prévia administrativa de exclusão. Ela informa os efeitos ou impedimentos antes de abrir a janela de Desfazer; não substitui a autorização/validação final. Uma associação criada durante a contagem ainda pode impedir o DELETE. Fotos próprias só são removidas após commit, incluindo as três posições. Nenhuma exclusão é apresentada como concluída antes da confirmação do servidor.

### Toasts e Desfazer

Os avisos Bootstrap existem somente nas páginas administrativas, no canto inferior direito, com responsividade, mensagens de erro/sucesso e sem expor SQL. Cadastro/edição que redirecionam levam um aviso para a página de destino.

Para usuário/próprio elegível, a interface consulta a prévia e mantém uma confirmação destrutiva. A linha continua presente, marcada e com ações desabilitadas, e aparece “Exclusão agendada” com o nome do registro e Desfazer. Somente após sete segundos começa o DELETE. Desfazer cancela o timer e nenhuma requisição de exclusão é enviada. Não há restauração simulada, soft delete ou fila no servidor.

Pedidos repetidos para a mesma linha são ignorados; registros diferentes podem ter contagens independentes. Atualizações de tabela preservam as linhas pendentes e descartam respostas antigas. Ao começar o envio, Desfazer é desabilitado; sucesso ou erro é exibido após a resposta. Um impedimento conhecido não inicia contagem. Erros de comunicação são apresentados de forma compreensível.

Sair/recarregar cancela as operações ainda não enviadas. Um contador em `sessionStorage` permite avisar desse cancelamento no próximo acesso administrativo. Se já havia uma requisição em envio, o aviso orienta conferir a tabela; não afirma cancelamento ou restauração de algo que possa ter sido excluído. Não são armazenadas credenciais nessa memória de avisos.

## APIs e banco

| Método e rota acrescentados | Uso |
|---|---|
| `GET /api/estabelecimentos/avaliacoes` | Agregação pública de nota/quantidade dos próprios numa consulta, sem dados pessoais ou N+1 |
| `GET /api/admin/usuarios/{id}/exclusao` | Prévia dos efeitos de excluir usuário; somente administrador |
| `GET /api/admin/estabelecimentos/{id}/exclusao` | Impedimentos e contagens para próprio; somente administrador |

Os DELETEs existentes continuam exigindo administrador, CSRF e transação. Clientes diretos das APIs mantêm seu contrato; a janela de cancelamento é um comportamento da interface administrativa. Não houve alteração de Entities, tabelas ou colunas: **não há nova migração SQL nesta fase**. Classificações antigas continuam válidas. A instalação/migrações anteriores permanecem documentadas nos relatórios correspondentes.

A master havia voltado a conter credenciais fixas, duplicação da chave Maps e bootstrap administrativo ligado. Os valores foram externalizados sem reproduzi-los. A escolha atual de `ddl-auto=update` foi mantida como padrão configurável; os testes MySQL usaram `DDL_AUTO=validate` sobre esquema manual. Para usar a aplicação, definir DB_URL, DB_USER/DB_USERNAME, DB_PASSWORD, GOOGLE_MAPS_API_KEY, GOOGLE_MAP_ID/GOOGLE_MAPS_MAP_ID e o diretório de uploads conforme README. OAuth2 continua opcional e usa as variáveis já documentadas; sua implementação não foi refeita. Bootstrap agora exige ativação e credenciais externas explícitas. Credenciais anteriormente publicadas permanecem no histórico e devem ser substituídas no serviço pelo responsável; esta proposta não reescreve o histórico.

## Arquivos por funcionalidade

- **Inicial/categorias:** `Controller/PaginasController.java`, `DTO/DadosEstabelecimentoDTO.java`, `templates/index.html`, `templates/fragmentos.html`, `static/css/indexCss.css`, catálogo de `static/js/app.js`.
- **Mapa:** `static/js/map.js`, novo `mapa-exploracao.js`, helper de pinos em `app.js`, `templates/map.html`, `static/css/map.css`, `painel.css` e novo `marcadores.css`. A galeria/interações existentes foram reutilizadas.
- **Resumo de avaliações:** novo `DTO/ResumoEstabelecimentoDTO.java`, `Repository/AvaliacaoRepository.java`, `Service/EstabelecimentosService.java` e `Controller/EstabelecimentosController.java`.
- **Administração:** novo `DTO/EstadoExclusaoDTO.java`; contagens em `FavoritosRepository`, `AvaliacaoRepository` e `CardapioRepository`; prévias/mensagens em `UsuarioService`, `EstabelecimentosService`, `AdministradorController`; `static/js/admin.js`, novo `admin-avisos.js`, ajuste de pino/aviso em `admin-form.js`; templates administrativos e `static/css/admin.css`.
- **Configuração:** `application.properties` e `application-test.properties`, sem credenciais reais novas.
- **Testes:** novo `ExclusoesAdministrativasTest.java`, teste SSR em `ControllersIntegrationTest.java`; novo `tests/frontend/mapa-exploracao.test.cjs`; novos `tests/browser/exploracao.cjs`, `desfazer.cjs` e auxiliares `apoio.cjs`/`sdk-exploracao.cjs`. Roteiros anteriores foram adaptados aos novos controles, sem retirar as verificações existentes.

Os caminhos Java são relativos a `src/main/java/com/aponte`; templates/static são de `src/main/resources`. A integração CEP foi preservada sem reescrita.

## Resultados de testes

- **Java/Maven verify:** 55 testes passaram, sem falhas/ignorados, com empacotamento Spring Boot para Java 17. Os testes padrão usam H2. Incluem os fluxos anteriores, treze cenários de exclusão/segurança/agregação e a seleção SSR de uma imagem única.
- **MySQL 8.4 isolado:** 43 testes de Controllers, exclusões e OAuth2 passaram com esquema manual e `validate`. Nenhum banco principal foi usado; foram criados bancos específicos desta fase.
- **Node:** cinco testes passaram para Haversine, raio estrito, coordenadas inválidas, ordenações distintas, empates, deduplicação por origem e recorte circular da busca textual.
- **Navegador:** os cinco roteiros `fluxo`, `modernizacao`, `mapa-simulado`, `exploracao` e `desfazer` passaram em desktop/mobile. Os três anteriores mantêm cobertura de login/perfil, favoritos, avaliações, fotos, Cardápio, segurança e administração. Os novos verificam os filtros combinados e a fila cancelável com tempo real, duplicidade/simultaneidade, cancelamento no reload, erro por vínculo concorrente, preservação de outra conta e exclusão das três fotos somente após confirmação. Não houve `pageerror` nos fluxos verificados. Falhas externas do SDK são registradas separadamente abaixo.

Capturas locais em `tests/browser/artifacts`: `exploracao-simulada-desktop.png`, `exploracao-simulada-mobile.png`, `detalhes-simulados-mobile.png`, `admin-exclusao-agendada.png` e `admin-toast-mobile.png`. As capturas com o mapa substituto trazem a identificação “SDK Google simulado — teste de contrato”. Artefatos permanecem fora do Git; os links da entrega apontam para os arquivos locais.

### Google real e contratos simulados, separadamente

O Chromium voltou a tentar carregar o SDK real sem ignorar TLS. A requisição de script a `maps.googleapis.com` falhou com **ERR_CERT_AUTHORITY_INVALID**, antes de iniciar o mapa. Não foram instalados certificados nem desativadas verificações para contornar essa falha. `npm run test:google` reproduz o diagnóstico e registra hosts/status/erros sem a chave; retorna código 2 quando o SDK não está disponível.

Em chamadas HTTP separadas com TLS validado, a mesma chave disponível consultou a Places API real com os seis grupos novos e `maxResultCount=20`, raio 2 km em São Paulo. Todos retornaram HTTP 200:

| Categoria consultada | Resultados retornados | Com nota / quantidade |
|---|---:|---:|
| Italiana | 20 | 20 |
| Mexicana | 10 | 9 |
| Chinesa | 16 | 12 |
| Vegetariana | 20 | 20 |
| Frutos do mar | 20 | 20 |
| Docerias (união dos nove tipos) | 20 | 20 |

Essas amostras confirmam a aceitação dos tipos e dos campos necessários nessas chamadas HTTP; não comprovam o funcionamento do SDK, das restrições de referenciador ou das fotos no navegador. Ausência de nota em algumas respostas reforça o tratamento de dados faltantes. Não foram persistidos nomes, coordenadas, notas ou fotos Google no MySQL para esses testes.

Nos testes `mapa-simulado` e `exploracao`, somente o SDK é substituído explicitamente; Spring, sessão, APIs Aponte e MySQL são reais. Foram verificadas as opções/retornos contratados, filtros, categoria, marcadores, coordenadas/âncoras, notas e galeria. Não se apresenta isso como uma execução real do mapa. OAuth2 real não foi refeito nem autenticado externamente nesta fase; os testes de contrato/segurança existentes continuam passando.

## Execução e pendências

Usar Java 17+, MySQL e as configurações externas do README. Nesta fase basta atualizar código e configuração; não há script SQL adicional. Execute `bash ./mvnw verify`; para frontend, em `tests/browser`, configure um banco/app isolados e as credenciais de teste, execute `npm ci`, `npm run test:frontend` e `npm run test:all`. `npm run test:google` é a verificação externa separada. Os testes destrutivos usam somente registros próprios de fixture e jamais devem apontar para uma base importante.

Não foi identificado defeito de persistência ainda pendente nas exclusões permitidas. O relato original não permite determinar qual operação havia falhado; os bloqueios legítimos agora são explicados e os cenários foram reproduzidos com dados controlados. Permanece pendente a verificação visual/funcional do SDK Google real em um navegador com cadeia TLS confiável. Não foi feito merge automático na master.
