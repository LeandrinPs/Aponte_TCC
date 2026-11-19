# Controllers e integração do Aponte

> Relatório histórico do PR anterior. Para perfil, OAuth2 opcional, galeria, navegação e testes atuais, consulte [MODERNIZACAO.md](MODERNIZACAO.md).

## A. Arquitetura implementada

A implementação parte da `master` `f00557dccb688258dfea6e2e053322074fb5eac0`, que já incorpora os PRs de persistência e Services e as alterações de front-end do grupo. Não recria a aplicação. O alvo continua Java 17, com Spring Boot 4.1.1.

### Comunicação

- `PaginasController` entrega as páginas Thymeleaf e suas configurações públicas de Maps. Os endereços `.html` existentes continuam funcionando, sem Live Server. A antiga página experimental `testemap.html` redireciona ao mapa definitivo.
- `UsuarioController` recebe cadastro e operações do perfil, informa o estado da sessão e fornece o token CSRF.
- `EstabelecimentosController` consulta cadastros próprios para o mapa, busca por ID interno e por Place ID. Substitui o esboço com nome incorreto `EstabalecimentosController`.
- `FavoritosController`, `AvaliacaoController` e `CardapioController` ligam o JavaScript aos Services correspondentes.
- `AdministradorController` delega a usuários/estabelecimentos/cardápios/moderação, incluindo indicadores e foto principal. Consultas de contagem estão no Service, nunca nos Controllers.
- `ImagensController` serve somente os nomes gerados pelo armazenamento de fotografias; não expõe uma pasta arbitrária do servidor.
- `ErrosController` é um `@RestControllerAdvice` para os erros das APIs: validação 400, autenticação 401, autorização 403, inexistência 404, conflito 409, tamanho 413 e persistência indisponível 503. Respostas de erro contêm `mensagem`, não a exceção, senha, SQL ou stack trace. A página `error.html` trata a navegação HTML com aparência do Aponte.

Regras de autoria, duplicidade, nota, preço e exclusão continuam nos Services existentes. Foram acrescentadas apenas as operações necessárias para listar cadastros próprios, consultar indicadores e manter a foto principal.

### Segurança

`SegurancaConfig` usa autenticação local por sessão, com a implementação de `UserDetailsService` e BCrypt já existentes. Usuários entram por e-mail; administradores da entidade separada entram por `admin:<nome>`. Os Services continuam conferindo `PrincipalAponte`, papel e existência da conta.

As páginas públicas e as consultas públicas são liberadas. `/api/me/**` e favoritos exigem conta de usuário; `/admin/**` e `/api/admin/**` exigem administrador. Não há JWT nem elevação de papéis por campos enviados pelo navegador.

CSRF permanece habilitado. O Thymeleaf insere o campo nos formulários de login; logout usa POST com token. `app.js` obtém o token em `/api/csrf` e o envia no cabeçalho indicado pelo servidor nas escritas via `fetch`, inclusive upload. As credenciais seguem a sessão da mesma origem. Falhas 401/403 nas APIs recebem JSON; páginas protegidas redirecionam ao login ou mostram acesso restrito.

O cache de destino após login guarda apenas a página de favoritos. Requisições de API, favicon e arquivos não se tornam destinos de login. Administradores entram no painel; usuários entram no mapa ou retornam aos favoritos quando essa foi a página solicitada.

A opção de login Google antes exibida foi retirada das telas, porque não há uma associação OAuth2 funcional com contas locais. Isso não altera a integração Maps/Places. As dependências existentes não foram convertidas em uma promessa de autenticação Google funcionando.

O provisionamento inicial de administrador é opcional, via variáveis de ambiente, com senha BCrypt, sem senha padrão e sem redefinir contas existentes. Deve ser desativado após a criação inicial. Nenhuma rota pública cria administradores.

## B. Endpoints disponíveis

Todos os corpos de escrita JSON são validados. `ref` significa exatamente um dos parâmetros `id` (interno, positivo) ou `googlePlaceId` (opaco, preservando caixa); não um ID de usuário.

| Método | URL | Finalidade | Acesso |
|---|---|---|---|
| GET | `/`, `/index.html`, `/map.html`, `/catalo.html` | Páginas públicas | Público |
| GET | `/forma.html`, `/entra.html` | Cadastro e login | Público |
| GET | `/sobre.html`, `/privacidade.html`, `/termos.html` | Informações do projeto | Público |
| GET | `/favoritos.html` | Página de favoritos | Usuário |
| GET | `/admin`, `/admin/usuarios`, `/admin/estabelecimentos` | Administração | Administrador |
| GET | `/admin/estabelecimentos/novo`, `/admin/estabelecimentos/{id}` | Formulário de cadastro/edição | Administrador |
| POST | `/login` | Formulário `username` e `password` | Público, com CSRF |
| POST | `/logout` | Encerrar sessão | Com CSRF |
| GET | `/api/csrf` | Token e nome do cabeçalho CSRF | Público |
| GET | `/api/sessao` | Estado da sessão, tipo de conta e nome | Público; não expõe hashes |
| POST | `/api/usuarios` | Cadastrar `UsuarioCadastroDTO` | Público, com CSRF |
| GET | `/api/me` | Perfil atual | Usuário |
| PUT | `/api/me` | Atualizar nome/e-mail | Usuário |
| PUT | `/api/me/senha` | Trocar senha com senha atual | Usuário |
| GET | `/api/estabelecimentos` | Listar cadastros próprios | Público |
| GET | `/api/estabelecimentos/{id}` | Consultar registro interno | Público |
| GET | `/api/estabelecimentos/google?googlePlaceId=...` | Consultar referência local Google | Público |
| GET | `/api/me/favoritos` | Listar os próprios favoritos | Usuário |
| GET | `/api/me/favoritos/existe?ref` | Verificar favorito próprio | Usuário |
| POST | `/api/me/favoritos` | Favoritar com corpo `ReferenciaEstabelecimentoDTO` | Usuário |
| DELETE | `/api/me/favoritos?ref` | Remover somente o próprio favorito | Usuário |
| GET | `/api/avaliacoes?ref` | Avaliações locais do estabelecimento | Público |
| GET | `/api/avaliacoes/resumo?ref` | Média e quantidade do Aponte | Público |
| GET | `/api/me/avaliacoes` | Avaliações do usuário atual | Usuário |
| POST | `/api/me/avaliacoes` | Registrar `{referencia, dados:{nota, comentario}}` | Usuário |
| PUT | `/api/me/avaliacoes/{id}` | Editar nota/comentário próprios | Autor |
| DELETE | `/api/me/avaliacoes/{id}` | Excluir avaliação própria | Autor |
| GET | `/api/cardapios?ref`, `/api/cardapios/{id}` | Consultar itens próprios do Aponte | Público |
| GET | `/api/admin/resumo` | Seis indicadores reais do MySQL | Administrador |
| GET | `/api/admin/usuarios`, `/api/admin/usuarios/{id}` | Consultar usuários sem senhas | Administrador |
| PUT | `/api/admin/usuarios/{id}` | Atualizar nome/e-mail | Administrador |
| DELETE | `/api/admin/usuarios/{id}` | Excluir usuário segundo as regras dos Services | Administrador |
| GET | `/api/admin/estabelecimentos`, `/api/admin/estabelecimentos/{id}` | Consultar próprios e referências Google | Administrador |
| POST | `/api/admin/estabelecimentos` | Criar cadastro próprio | Administrador |
| PUT | `/api/admin/estabelecimentos/{id}` | Editar cadastro próprio | Administrador |
| DELETE | `/api/admin/estabelecimentos/{id}` | Excluir próprio sem vínculos impeditivos | Administrador |
| POST | `/api/admin/estabelecimentos/{id}/foto` | Enviar/substituir foto em multipart `arquivo` | Administrador; somente próprios |
| DELETE | `/api/admin/estabelecimentos/{id}/foto` | Remover a foto principal | Administrador; somente próprios |
| POST | `/api/admin/cardapios` | Criar `{referencia, dados:{nome, descricao, preco}}` | Administrador |
| PUT | `/api/admin/cardapios/{id}` | Atualizar item | Administrador |
| DELETE | `/api/admin/cardapios/{id}` | Excluir item | Administrador |
| DELETE | `/api/admin/avaliacoes/{id}` | Moderar removendo avaliação | Administrador |
| GET | `/imagens/{nome}` | Fotografia normalizada armazenada | Público; nome estritamente validado |

Criações de recursos retornam 201; exclusões retornam 204. O login/logout nativo usa redirecionamentos de formulário. As APIs privadas nunca recebem um `usuarioId` para determinar o autor. As operações de perfil foram disponibilizadas pelos contratos dos Services; esta etapa não acrescenta uma tela de perfil que não foi solicitada.

## C. Páginas e recursos

HTMLs foram movidos de `frontende/Tcc` para `src/main/resources/templates`; CSS, JavaScript e imagens para `src/main/resources/static`. Não há duas cópias concorrentes dos mesmos arquivos. As imagens e os estilos do grupo foram reaproveitados.

| Página | Integração |
|---|---|
| `index.html` | Hero, pesquisa e acesso ao mapa preservados. Cards de cadastros próprios reais substituem o ranking ilustrativo de restaurantes. |
| `forma.html` | Nome, e-mail, senha, botão de envio, validação e mensagens. Cadastro por API e redirecionamento ao login. Corrigido o JavaScript que usava `dns.resolveMx`, inexistente no navegador. |
| `entra.html` | Formulário Spring Security com CSRF, erros de credenciais e mensagem de conta criada. Aceita e-mail e namespace administrativo. |
| `map.html` | Resultados Google, próprios, fotos, favorito, avaliações próprias/Google separadas, cardápio e rotas. Mantém abas e painel lateral. |
| `favoritos.html` | Lista persistida por usuário. Fotos/detalhes próprios vêm do Aponte; detalhes Google são consultados pelo Place ID no SDK. Remoção por API. |
| `catalo.html` | Links corrigidos para o mapa e tipos reconhecidos pelo Places, sem Entity/tabela Categoria. |
| `sobre.html`, `privacidade.html`, `termos.html` | Destinos reais para links do rodapé, com informações simples coerentes com o projeto acadêmico. |
| `admin/index.html` | Indicadores de usuários, registros internos, próprios, referências Google, favoritos e avaliações. |
| `admin/usuarios.html` | Lista, edição e exclusão por operações autorizadas. |
| `admin/estabelecimentos.html` | Diferencia origens, fornece acesso ao mapa, manutenção de próprios e, na mesma página, cardápio e moderação. |
| `admin/formulario.html` | Cadastro/edição, coordenadas por clique no mapa ou entrada manual, foto principal, substituição e remoção. |
| `fragmentos.html` | Cabeçalho/rodapé compartilhados. Navegação, nome da sessão, painel e logout refletem a conta atual. |
| `error.html` | Erros de navegação sem expor mensagens internas. |

A navegação usa o Spring Boot; não depende de Live Server. Endereços `.html` do site foram preservados. A barra de pesquisa tem fallback para cadastros próprios quando o SDK Google não está disponível. Quando o SDK carrega, o autocomplete Google ocupa a mesma área. A pesquisa por nome local usa o parâmetro `busca`; categorias continuam aplicadas ao Google.

Bootstrap 5.3.8 e Bootstrap Icons 1.13.1 foram incluídos localmente, com licenças MIT, em `static/css/vendor` e `static/js/vendor`. Isso evita perder o estilo caso o CDN esteja indisponível. `integracao.css` acrescenta os ajustes de formulários, administração e responsividade sem substituir a identidade visual. A altura real do cabeçalho é observada para não cobrir o conteúdo em telas pequenas.

## D. Google Maps e mapa híbrido

- A pesquisa mantém Maps JavaScript API e Places API (New): autocomplete, clique em pontos do mapa e `Place.searchNearby`.
- O ID externo vem de `Place.id`/`event.placeId`; é enviado como `googlePlaceId`. Cadastros próprios usam `id` numérico. Favoritos, avaliações e cardápios usam o mesmo contrato de referência já definido nos Services.
- Cadastros próprios são consultados em `/api/estabelecimentos`, recebem seus próprios marcadores e podem abrir o painel sem um registro no Google. A lista abaixo do mapa também permite acessá-los quando o SDK está indisponível.
- Os marcadores próprios e os marcadores dos resultados Google ficam em coleções separadas. Uma nova pesquisa apaga apenas os resultados Google anteriores.
- Para evitar duplicidades visuais óbvias, um resultado Google com nome normalizado igual e distância inferior a aproximadamente 40 metros de um cadastro próprio não ganha um segundo marcador de resultado. Isso é uma heurística conservadora de apresentação, não uma fusão de registros, autoria ou IDs. Pontos nativos da base cartográfica Google não são removidos.
- Filtros usam `pizza_restaurant`, `hamburger_restaurant`, `cafe`, `japanese_restaurant`, `barbecue_restaurant` e `brazilian_restaurant`. Cadastros próprios continuam visíveis: não se recriou uma Categoria persistente.
- A seleção usa uma sequência de carregamento para impedir que uma resposta tardia preencha o painel do estabelecimento errado.
- A interface distingue a nota pública Google da média/quantidade das notas do Aponte. Comentários são renderizados com `textContent`, sem interpretar HTML.
- Rotas usam uma URL oficial de direções do Google Maps com coordenadas e, quando existente, `destination_place_id`. Não havia integração Routes API efetiva no código analisado; não foi adicionada outra integração REST nem prometido cálculo de rota dentro do backend.

O cadastro administrativo não publica nem modifica estabelecimentos no banco público do Google. Somente o Place ID é persistido para referências Google; detalhes e fotografias continuam efêmeros no navegador.

## E. Fotografias

### Google

O carregamento volta a pedir `photos` em `fetchFields`. A primeira fotografia é obtida por `Photo.getURI`, com atribuições dos autores e marca oficial Google Maps, inclusive na página de favoritos fora do mapa. Não se gravam a fotografia nem sua URL temporária no MySQL.

A marca utilizada é o SVG original dos [assets oficiais de atribuição Google Maps](https://developers.google.com/static/maps/documentation/images/Google_Maps_Attribution_Assets.zip), sem alteração do desenho, exibido sobre fundo claro. Políticas de referência: [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies).

### Próprias

Foi adotada **uma fotografia principal**, suficiente para o escopo sem acrescentar uma Entity de galeria. O banco armazena somente `foto_principal`, um nome UUID gerado no servidor. O DTO fornece a URL pública correspondente. Fotografias ficam em `APONTE_UPLOADS_DIR`, fora do JAR.

O upload:

- exige administrador e cadastro próprio;
- aceita somente JPEG/PNG decodificáveis, até 5 MB;
- verifica o formato real e a compatibilidade do tipo informado;
- limita dimensões a 6.000 pixels por lado e 12 megapixels;
- ignora o nome original, reencodifica a imagem e gera um nome seguro;
- recusa SVG e outros formatos arbitrários;
- não permite escolher caminhos do servidor.

O registro é bloqueado para atualização durante a troca da fotografia. O arquivo antigo só é removido após o commit. Em rollback, o novo arquivo é removido e o antigo é preservado. Remover o cadastro próprio também agenda a limpeza da sua fotografia após a confirmação. Falhas de limpeza são registradas para diagnóstico, sem invalidar retroativamente um commit concluído.

A interface verifica o tamanho antes de enviar e mantém o ID do cadastro já criado caso a fase de fotografia falhe; uma nova tentativa não duplica o estabelecimento. Ausência ou falha de imagem usa `/img/imagem.jpeg`, um recurso já existente do Aponte.

Para backups e restaurações, preserve banco **e** pasta de arquivos. A pasta não deve ser apagada ao trocar o JAR. Ela e `.env` são ignoradas pelo Git.

## F. Banco e configurações

Nesta etapa, a única coluna nova é `estabelecimentos.foto_principal VARCHAR(100) NULL`. Os identificadores e nomes anteriores são preservados. Não foram criadas tabelas de Horário, Categoria ou galeria.

- Banco existente: faça backup, confira o esquema e a aplicação anterior de `MIGRACAO_SERVICE.sql`. Depois revise e execute manualmente `MIGRACAO_CONTROLLERS.sql`. Não execute duas vezes a adição de coluna.
- Banco novo: crie um banco vazio e um usuário MySQL autorizado; revise e execute `SCHEMA_NOVO.sql` nesse banco. O arquivo não apaga nem substitui tabelas.
- O Hibernate permanece com `ddl-auto=validate`, sem migração automática. Os testes padrão usam `create-drop` somente em H2.
- A conexão usa `DB_URL`, `DB_USERNAME` e `DB_PASSWORD`. A configuração anterior com MySQL apontando para a porta 8080 foi substituída por um padrão de desenvolvimento na porta 3306, com possibilidade de sobrescrever via `DB_URL`.
- A chave pública de navegador Maps passou a `GOOGLE_MAPS_API_KEY`, sem chave fixa nos HTMLs; configure restrições de referenciador e os serviços Google necessários. O Map ID usa `GOOGLE_MAPS_MAP_ID`.
- Cookies de sessão são HTTP-only e SameSite=Lax. Para uso fora do ambiente local, sirva a aplicação por HTTPS e configure o cookie seguro conforme o ambiente de hospedagem.

Nenhuma migração foi executada no banco do usuário. A validação MySQL ocorreu em contêiner novo e isolado, criado para esta tarefa, com bancos `aponte_teste` e `aponte_http` sem dados reais.

## G. Verificação funcional e limites

### Evidência executada

| Verificação | Resultado |
|---|---|
| Maven `clean verify`, alvo Java 17, JDK 21 de execução | 25 testes Java aprovados (12 existentes e 13 HTTP), zero falhas/erros, JAR executável gerado. |
| Testes existentes do contexto/Repositories/restrições | Preservados e aprovados. |
| `ControllersIntegrationTest` com H2 | Cadastro, login/logout, CSRF, permissões, favoritos, autoria de avaliações, média, cardápio, indicadores, fotos e respostas de erro aprovados. |
| Mesmos testes HTTP com MySQL 8.4.13 | Os mesmos 13 testes HTTP aprovados com esquema manual e `ddl-auto=validate`, sem substituir o MySQL por H2. Inclui Place IDs distintos por caixa. |
| Cadastro/login/logout no Chromium | Aprovados com a aplicação real e MySQL isolado. |
| Cadastros próprios e foto pelo formulário administrativo | Aprovados; leitura pública e foto disponível por HTTP. |
| Cardápio pela administração e consulta pública | Aprovados. |
| Favoritos após logout e novo login | Persistência confirmada no MySQL. |
| Avaliação, edição pelo autor e moderação pelo administrador | Aprovadas; média/contagem atualizadas. Texto com marcação HTML não foi executado. |
| Alteração e exclusão administrativa de usuário pela interface | Aprovadas. |
| Substituição/remoção de foto | Aprovadas; URL antiga passa a 404 após confirmação e a foto padrão aparece após remoção. |
| Acesso administrativo por usuário comum | Recusado, inclusive por API. |
| Responsividade | Testada em 1440×1000 e 390×844, incluindo ausência de transbordamento horizontal e conteúdo abaixo do cabeçalho. |
| Contrato do mapa híbrido com SDK Google simulado | Marcadores próprios preservados após novas pesquisas, tipos Google, deduplicação visual, fotos/atribuições, favoritos por Place ID e notas separadas aprovados. Não é validação da API Google real. |

Os scripts reproduzíveis estão em `tests/browser`, com dependência Playwright fixada e lockfile. São executados somente quando o operador confirma `APONTE_E2E_BANCO_ISOLADO=SIM`. Criam contas/cadastros temporários; não devem ser usados no banco real. Os testes não desativam CSRF nem a autorização do sistema.

### Problemas encontrados e corrigidos durante a validação

- Formulários vazios/sem envio, links de catálogo inexistentes e o antigo uso de `dns.resolveMx` no navegador foram corrigidos.
- O login podia redirecionar a um favicon salvo como destino. O cache foi limitado a páginas esperadas e foi acrescentado teste de regressão.
- Uma imagem de teste acima de 5 MB foi recusada corretamente; a interface passou a conferir esse limite antes da fase de cadastro e mostrar uma mensagem específica.
- O cabeçalho sobrepunha conteúdo no celular; o espaçamento agora acompanha sua altura real.
- A página inicial também tinha fechamento HTML e carregamentos de SDK/scripts duplicados, incluindo uma chave de exemplo; foram corrigidos e cobertos por teste de regressão.
- O JavaScript analisado já não pedia fotografias Google; o campo e as atribuições foram recuperados.
- O navegador do ambiente não carregou o CDN por confiança TLS. Bootstrap/ícones agora são recursos locais da aplicação.

### Limites importantes

A chamada real ao SDK/serviço Google **não foi aprovada como funcional neste ambiente**. O Chromium não confia no certificado de rede do ambiente e recusou os pedidos HTTPS externos. A revisão automática rejeitou a alteração persistente desse truststore; foi solicitada autorização ao usuário, sem desativar TLS nem contornar a rejeição. A suíte de mapa simulado comprova apenas o contrato e a integração do JavaScript com o backend real.

A chave do projeto também precisa estar habilitada e autorizada para o domínio em que o site for executado. Geolocalização depende da permissão do navegador; não se declarou validada a posição real do usuário. O link de direções é produzido com os identificadores corretos; não foi alegado um cálculo de rota pela Routes API.

O MySQL **existente do usuário** não foi acessado. O esquema novo e as operações foram validados em MySQL 8.4.13 isolado; a revisão e aplicação das migrações sobre dados existentes continuam manuais. OAuth2 Google não faz parte da autenticação entregue.

## H. Execução e demonstração

1. Siga as variáveis e os comandos do [README](../README.md). Prepare o banco por um dos roteiros da seção F.
2. Execute `bash ./mvnw spring-boot:run` (ou `mvnw.cmd spring-boot:run` no Windows). O site fica em `http://localhost:8080`, salvo configuração de `SERVER_PORT`.
3. Cadastre uma conta comum em `/forma.html`, faça login em `/entra.html` e visite `/map.html`. Favorite/avalie o estabelecimento selecionado e confira `/favoritos.html` após sair e entrar novamente.
4. Para um administrador inicial, habilite explicitamente `APONTE_ADMIN_BOOTSTRAP_ENABLED`, informe nome/senha por ambiente e inicie uma vez. Entre com `admin:<nome>`. Depois desabilite o provisionamento. Não existe senha padrão.
5. Abra `/admin`, veja os indicadores e siga para estabelecimentos. Preencha o formulário, selecione um ponto no mapa ou informe as coordenadas e envie uma foto JPEG/PNG de até 5 MB.
6. O estabelecimento aparece em `/map.html` e nos cards públicos. O painel oferece favoritos, avaliações locais, cardápio e direções. Os resultados Google continuam independentes do cadastro MySQL.
7. Em administração → estabelecimentos e interações, selecione um registro para manter o cardápio e moderar avaliações. Em usuários, edite/exclua contas conforme as regras dos Services.
8. Para repetir os testes de navegador, utilize **outra base isolada**, instale as dependências de `tests/browser` e siga as instruções do README. Fotos e registros reais não são necessários para reproduzir a validação.

A aplicação está integrada para os fluxos descritos e efetivamente testados; isso não representa publicação em produção, validação do banco existente ou comprovação do acesso real à plataforma Google neste ambiente.
