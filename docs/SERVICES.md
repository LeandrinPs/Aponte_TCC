# Camada Service do Aponte — relatório de implementação

## A. Services e análise do projeto

A implementação reaproveita o PR #1 já incorporado e foi integrada à `master` no commit `025fead90cf005433d55a6fbde72dc55e9220b3a`. As atualizações de front-end recebidas durante o trabalho foram preservadas. As seis classes existentes do pacote `com.aponte.Service` foram implementadas; os nomes plurais `EstabelecimentosService` e `FavoritosService` foram preservados. Não foram criados Controllers nem alterados HTML, CSS ou JavaScript.

| Service | Responsabilidade |
|---|---|
| `EstabelecimentosService` | Consultar registros, reutilizar referências Google e administrar cadastros próprios. |
| `UsuarioService` | Cadastro, perfil, senha, consulta administrativa e exclusão consistente de usuários. |
| `FavoritosService` | Favoritos do usuário autenticado, com referência interna ou Place ID. |
| `AvaliacaoService` | Notas e comentários do Aponte, autoria, moderação e agregação das notas. |
| `CardapioService` | Consulta pública e manutenção administrativa dos itens próprios do Aponte. |
| `AdministradorService` | Fachada simples do painel: delega regras e transações aos Services responsáveis. |

Todas usam `@Service`, injeção por construtor (`@RequiredArgsConstructor`) e validação de métodos (`@Validated`). Consultas usam transações de leitura; escritas usam `@Transactional`. Os métodos públicos devolvem DTOs, sem expor entidades ou hashes. `Persistencia` é apenas um auxiliar interno de tratamento de exceções, não um sétimo Service.

### O que foi encontrado

- Os relacionamentos persistentes são `Favoritos.usuario`, `Favoritos.estabelecimento`, `Avaliacao.usuario`, `Avaliacao.estabelecimento` e `Cardapio.estabelecimento`.
- As Entities/Repositories já continham as correções do PR #1. Os Services e Controllers ainda eram esboços. Não havia DTOs nem configuração própria de segurança.
- `frontende/Tcc/js/map.js` faz a pesquisa com `Place.searchNearby`, recebe `Place.id` e também utiliza `event.placeId` ao clicar no mapa. `fetchFields` carrega detalhes do Places para exibição. Esses caminhos foram mantidos integralmente.
- Os filtros do catálogo continuam no front-end. O JavaScript observado usa `includedTypes: ["restaurant"]`; o mapeamento de cada filtro do catálogo para os tipos aceitos pelo Places ainda precisa de integração no front-end, fora desta etapa.
- As dependências OAuth2 client já existiam, mas não há `ClientRegistration` Google configurado nem associação de identidades Google às contas do Aponte. O link `/oauth2/authorization/google` não prova que OAuth2 funciona.
- Não há `Horario`, `HorarioRepository`, `Categoria` ou `CategoriaRepository`, nem referências remanescentes a essas entidades no código Java. Nenhum Service dessas funcionalidades foi criado. A exibição de horários do Google e os filtros no site foram preservados.

## B. Métodos públicos

Tipos sem qualificação pertencem a `com.aponte.DTO`. Os IDs internos são `Long`, sempre positivos. Não se recebe um `usuarioId` para decidir a autoria de favoritos ou de avaliações novas: a identidade vem do `SecurityContext`.

### EstabelecimentosService

| Método e parâmetros | Retorno | Responsabilidade e regras |
|---|---|---|
| `listar()` | `List<EstabelecimentoDTO>` | Registros já existentes no Aponte; não substitui a pesquisa do Google. Consulta pública. |
| `buscarPorId(Long id)` | `EstabelecimentoDTO` | Busca interna ou erro de recurso inexistente. |
| `buscarPorGooglePlaceId(String googlePlaceId)` | `EstabelecimentoDTO` | Consulta a referência local, sem chamar ou alterar o Google. Erro se ausente. |
| `existeGooglePlaceId(String googlePlaceId)` | `boolean` | Verifica referência persistida. |
| `obterOuCriarReferenciaGoogle(String googlePlaceId)` | `EstabelecimentoDTO` | Exige conta local autenticada. Reutiliza ou cria registro contendo somente o Place ID. |
| `cadastrarProprio(DadosEstabelecimentoDTO dados)` | `EstabelecimentoDTO` | Administrador; valida campos completos e coordenadas do cadastro próprio. |
| `atualizarProprio(Long id, DadosEstabelecimentoDTO dados)` | `EstabelecimentoDTO` | Administrador; somente registros sem Place ID podem ser editados. |
| `excluirProprio(Long id)` | `void` | Administrador; rejeita referências Google e registros com favoritos, avaliações ou cardápios. Não faz exclusão em cascata. |

Os métodos de resolução de entidades usados pelos demais Services têm visibilidade de pacote. Eles não fazem parte da API de Controllers. Uma consulta a um ID interno inexistente gera erro; para um Place ID ainda sem referência, as consultas públicas de cardápios/avaliações retornam listas vazias e não gravam dados.

### UsuarioService

| Método e parâmetros | Retorno | Responsabilidade e regras |
|---|---|---|
| `cadastrar(UsuarioCadastroDTO dados)` | `UsuarioDTO` | Cadastro sem atribuição de papéis; nome, e-mail e senha válidos. E-mail normalizado para minúsculas e protegido por unicidade. Senha com BCrypt. |
| `buscarPorId(Long id)` | `UsuarioDTO` | Próprio usuário ou administrador. |
| `buscarMeuPerfil()` | `UsuarioDTO` | Perfil da conta de usuário autenticada. |
| `buscarPorEmail(String email)` | `UsuarioDTO` | Administrador; consulta sem distinguir maiúsculas. |
| `listar()` | `List<UsuarioDTO>` | Administrador; nenhuma senha ou hash. |
| `existeEmail(String email)` | `boolean` | Administrador; não cria um endpoint público de enumeração de usuários. |
| `atualizarMeuPerfil(UsuarioAtualizacaoDTO dados)` | `UsuarioDTO` | Atualiza somente nome/e-mail do próprio usuário. Mantém a senha e rejeita e-mail usado por outra conta. |
| `atualizarComoAdministrador(Long id, UsuarioAtualizacaoDTO dados)` | `UsuarioDTO` | Mesmas validações, com autorização administrativa. Não permite promover usuários ou definir hashes pelo DTO. |
| `alterarMinhaSenha(String senhaAtual, String novaSenha)` | `void` | Verifica a senha atual e grava um novo hash. Nova senha com 8 a 72 caracteres e até 72 bytes UTF-8, limite do BCrypt. |
| `excluir(Long id)` | `void` | Somente administrador; remove favoritos/avaliações desse usuário e a conta na mesma transação. Preserva estabelecimentos, outros usuários e cardápios. |

### FavoritosService

| Método e parâmetros | Retorno | Responsabilidade e regras |
|---|---|---|
| `adicionar(ReferenciaEstabelecimentoDTO referencia)` | `FavoritoDTO` | Conta de usuário autenticada; resolve ID interno ou cria referência Google. Rejeita favorito duplicado. |
| `remover(ReferenciaEstabelecimentoDTO referencia)` | `void` | Remove apenas o favorito do usuário autenticado. Ausência gera erro; nunca exclui o estabelecimento compartilhado. |
| `listarMeus()` | `List<FavoritoDTO>` | Somente os favoritos do usuário autenticado. |
| `existe(ReferenciaEstabelecimentoDTO referencia)` | `boolean` | Verifica o favorito do usuário atual. Place ID sem referência retorna `false`. |

### AvaliacaoService

| Método e parâmetros | Retorno | Responsabilidade e regras |
|---|---|---|
| `registrar(ReferenciaEstabelecimentoDTO referencia, AvaliacaoDadosDTO dados)` | `AvaliacaoDTO` | Usuário autenticado; uma avaliação por usuário/estabelecimento, nota inteira de 1 a 5, comentário opcional até 1.000 caracteres. |
| `listarPorEstabelecimento(ReferenciaEstabelecimentoDTO referencia)` | `List<AvaliacaoDTO>` | Consulta pública das avaliações locais do Aponte. |
| `listarMinhas()` | `List<AvaliacaoDTO>` | Avaliações da conta de usuário autenticada. |
| `listarPorUsuario(Long usuarioId)` | `List<AvaliacaoDTO>` | Próprio usuário ou administrador; valida existência da conta. |
| `resumir(ReferenciaEstabelecimentoDTO referencia)` | `ResumoAvaliacoesDTO` | Quantidade e média, calculadas pelo Repository somente sobre notas do Aponte. |
| `calcularMedia(ReferenciaEstabelecimentoDTO referencia)` | `Double` | Média local; `null` quando não existem avaliações. |
| `contar(ReferenciaEstabelecimentoDTO referencia)` | `long` | Quantidade local; zero quando não existem avaliações. |
| `editarMinha(Long id, AvaliacaoDadosDTO dados)` | `AvaliacaoDTO` | Somente o autor pode editar. Revalida nota/comentário e mantém o estabelecimento. |
| `excluirMinha(Long id)` | `void` | Somente o autor. |
| `excluirComoAdministrador(Long id)` | `void` | Moderação administrativa por remoção. Não atribui notas em nome do autor. |

Comentários em branco são normalizados para `null`. Comentários são texto, não HTML confiável; futuros Controllers/front-end devem renderizá-los como texto, sem inserção por `innerHTML`. A média pública do Google nunca entra nessas consultas.

### CardapioService

| Método e parâmetros | Retorno | Responsabilidade e regras |
|---|---|---|
| `listar(ReferenciaEstabelecimentoDTO referencia)` | `List<CardapioDTO>` | Consulta pública por ID interno ou Place ID. Sem referência Google, retorna lista vazia sem criar registro. |
| `buscarPorId(Long id)` | `CardapioDTO` | Consulta pública, com erro para item inexistente. |
| `cadastrar(ReferenciaEstabelecimentoDTO referencia, CardapioDadosDTO dados)` | `CardapioDTO` | Administrador; resolve/cria referência Google ou valida ID interno. Nome/descrição obrigatórios; preço não negativo e compatível com `DECIMAL(10,2)`. |
| `atualizar(Long id, CardapioDadosDTO dados)` | `CardapioDTO` | Administrador; revalida campos e preserva o estabelecimento associado. |
| `excluir(Long id)` | `void` | Administrador; remove apenas o item, preservando a referência ao estabelecimento. |

Não há campo de disponibilidade, dependência de Categoria/Horário ou obtenção de cardápio pela API Google.

### AdministradorService

| Método e parâmetros | Retorno | Responsabilidade e regras |
|---|---|---|
| `listarUsuarios()` | `List<UsuarioDTO>` | Autoriza administrador e delega a `UsuarioService`. |
| `buscarUsuario(Long id)` | `UsuarioDTO` | Consulta administrativa sem informações sensíveis. |
| `atualizarUsuario(Long id, UsuarioAtualizacaoDTO dados)` | `UsuarioDTO` | Delega à atualização administrativa de usuários. |
| `excluirUsuario(Long id)` | `void` | Delega à exclusão consistente de usuários. |
| `listarEstabelecimentos()` | `List<EstabelecimentoDTO>` | Consulta administrativa dos registros locais. |
| `buscarEstabelecimento(Long id)` | `EstabelecimentoDTO` | Consulta administrativa por ID interno. |
| `buscarReferenciaGoogle(String googlePlaceId)` | `EstabelecimentoDTO` | Consulta administrativa da referência Google existente. |
| `cadastrarEstabelecimento(DadosEstabelecimentoDTO dados)` | `EstabelecimentoDTO` | Delega cadastro próprio. |
| `atualizarEstabelecimento(Long id, DadosEstabelecimentoDTO dados)` | `EstabelecimentoDTO` | Delega edição somente de cadastro próprio. |
| `excluirEstabelecimento(Long id)` | `void` | Delega exclusão condicionada à ausência de vínculos. |
| `removerAvaliacao(Long id)` | `void` | Delega moderação a `AvaliacaoService`. |

Todas essas operações exigem administrador, diretamente ou no Service delegado. A manutenção de cardápios usa `CardapioService`, que já faz essa autorização. A fachada não replica regras de persistência.

### Contratos DTO

- `UsuarioCadastroDTO(nome, email, senha)`: entrada de cadastro. Senha não é incluída em `toString` nem em serialização de saída (`WRITE_ONLY`).
- `UsuarioAtualizacaoDTO(nome, email)` e `UsuarioDTO(id, nome, email)`: atualização/resposta sem senha, hash ou campo de papel.
- `ReferenciaEstabelecimentoDTO(id, googlePlaceId)`: exatamente um identificador. ID interno positivo; Place ID não vazio, sem espaços e com no máximo 255 caracteres. Não exige prefixo fixo e não altera maiúsculas. O backend não confirma a existência pública do Place ID por uma nova chamada Google.
- `DadosEstabelecimentoDTO(nome, descricao, rua, numero, bairro, cidade, estado, cep, latitude, longitude)`: cadastro próprio. Limites originais das colunas; latitude entre -90/90 e longitude entre -180/180. Coordenadas permanecem strings, conforme a modelagem existente.
- `EstabelecimentoDTO(id, googlePlaceId, dadosProprios)`: `dadosProprios` é `null` para referências Google.
- `FavoritoDTO(id, usuarioId, estabelecimento)`.
- `AvaliacaoDadosDTO(nota, comentario)`, `AvaliacaoDTO(id, usuarioId, estabelecimento, nota, comentario)` e `ResumoAvaliacoesDTO(quantidade, media)`.
- `CardapioDadosDTO(nome, descricao, preco)` e `CardapioDTO(id, estabelecimento, nome, descricao, preco)`: nome até 50, descrição até 500, preço com até oito dígitos inteiros e duas casas decimais. Zero é permitido; não há arredondamento silencioso.

## C. Alterações complementares e decisões

### Persistência mínima

1. `Estabelecimentos.googlePlaceId` mapeia `google_place_id`, opcional e único. `null` identifica cadastros próprios; valor preenchido identifica referência Google. Não foi criada outra Entity ou um enum de origem redundante.
2. Nome, endereço, descrição e coordenadas passam a aceitar `NULL` no mapeamento, permitindo armazenar **somente** o Place ID. Os Services continuam exigindo todos os dados do cadastro próprio. Nenhuma coluna ou registro existente é apagado.
3. `Usuario.senha` passa de 50 para 100 caracteres para comportar BCrypt; o e-mail tem unicidade. Senhas e hashes são excluídos de `toString`, `equals/hashCode` e JSON nas entidades de usuário/administrador.
4. `Avaliacao.comentario` é opcional, `VARCHAR(1000)`. Avaliações e favoritos têm unicidade por `(id_user, id_estabelecimento)`, além das verificações de negócio.
5. Repositories recebem buscas por Place ID, consultas de e-mail sem distinção de caixa, existência de dependências, exclusão por usuário e agregação `AVG`/`COUNT`. Não há SQL em Services ou Controllers.
6. Nenhuma coluna de identificação foi renomeada: `Long id` mantém `id_user`, `id_adm`, `id_estabelecimento`, `id_favorito`, `id_avaliacao` e `id_cardapio`.
7. A única dependência nova é `spring-boot-starter-validation`. Spring Security/OAuth2 já existiam; H2 permanece no escopo de teste.
8. `spring.jpa.hibernate.ddl-auto` passa a `validate` em produção para impedir alterações automáticas no esquema. Os testes continuam com `create-drop` exclusivamente em H2. Antes de executar a aplicação sobre uma base existente, revise e aplique manualmente [MIGRACAO_SERVICE.sql](MIGRACAO_SERVICE.sql), após backup e análise das duplicidades. O arquivo fica em `docs`, não é executado pelo Spring.

### Concorrência, transações e erros

As operações de gravação e exclusão são atômicas. As restrições únicas são a defesa final contra requisições simultâneas. Uma corrida de criação do mesmo Place ID pode retornar a referência já criada ou gerar `ConflitoException` no perdedor. Nesse caso, o Controller deve responder 409; uma nova tentativa integral em outra transação reutiliza o registro existente. Não se consulta novamente uma transação já invalidada pelo banco.

Exceções de integridade são traduzidas para `ConflitoException`; outras falhas de gravação para `FalhaPersistenciaException`. A causa original é preservada para diagnóstico, mas suas mensagens SQL não são usadas como mensagens de negócio. Leituras conservam as exceções de acesso a dados do Spring; o futuro tratamento HTTP deve converter falhas de infraestrutura em erro genérico 500/503.

| Situação | Exceção/contrato | HTTP sugerido para os Controllers futuros |
|---|---|---|
| Dados/identificadores inválidos | `ConstraintViolationException`; `IllegalArgumentException` para limite UTF-8 da senha | 400 |
| Sem autenticação | `AuthenticationCredentialsNotFoundException` | 401 |
| Conta sem autorização ou identidade não associada | `AccessDeniedException` | 403 |
| Registro inexistente | `RecursoNaoEncontradoException` | 404 |
| Duplicidade, vínculo impeditivo ou registro Google imutável | `ConflitoException` | 409 |
| Infraestrutura/persistência | `FalhaPersistenciaException` ou `DataAccessException` | 500/503, mensagem genérica |

Não retorne a exceção, sua causa ou entidades como corpo HTTP. O `@RestControllerAdvice` para converter esse contrato será parte da etapa de Controllers, não foi antecipado aqui.

### Autenticação e autorização

`AutenticacaoAponte` implementa `UserDetailsService` para o mecanismo local do Spring Security. Usuários entram por e-mail; administradores da Entity separada entram pelo namespace `admin:<nome>`. Nomes administrativos ambíguos são recusados. `PrincipalAponte` carrega ID e tipo de conta definidos no servidor, com `ROLE_USER` ou `ROLE_ADMIN`. IDs iguais em tabelas diferentes não concedem acesso ao outro tipo de conta.

`AcessoAtual` verifica o `Authentication`, o tipo de principal, as autoridades e a existência atual da conta no banco. Não interpreta IDs, papéis, e-mail ou sinalizadores enviados pelo navegador como identidade confiável. Um principal OAuth2 ou `UserDetails` genérico não recebe privilégios locais sem associação explícita. Administradores não assumem automaticamente a autoria de favoritos/avaliações de usuários.

As verificações são explícitas dentro dos Services; não dependem de futuros Controllers lembrarem de autorizar as operações. O `PasswordEncoder` é BCrypt com custo 12. Não foi alterada a `SecurityFilterChain`, não se desativou CSRF e não se liberaram rotas ou papéis para facilitar testes. Os testes usam o mesmo mecanismo de validação do principal local em um contexto isolado.

Contas existentes com senha em texto puro não recebem fallback inseguro. É necessário um procedimento de redefinição de senha. Contas administrativas precisam ser provisionadas por um processo autorizado com hash compatível; não existe endpoint público para criar administradores.

### Google Maps Platform

A política oficial do Places consultada permite armazenar Place IDs como exceção às restrições de cache: [Places API policies — caching](https://developers.google.com/maps/documentation/places/web-service/policies). A implementação grava somente o identificador, sem copiar nomes, endereços, fotos, notas públicas ou horários para a referência. Os detalhes continuam sendo buscados e apresentados pelo JavaScript existente. Cadastros próprios e cardápios têm origem administrativa no Aponte. Nenhuma operação altera o cadastro público do Google.

Isso não comprova conformidade de toda a aplicação nem valida a existência de um ID arbitrário: atribuições, termos regionais, atualização de IDs e integração futura continuam sujeitos às políticas aplicáveis.

## D. Testes e resultados

Verificação inicial do projeto original: sete testes passaram. Após a implementação, a suíte final inclui:

| Classe | Quantidade | Cobertura |
|---|---:|---|
| `AponteApplicationTests` | 1 | Contexto completo com H2. |
| `RepositoryValidationTest` | 6 | Persistência e consultas dos repositories existentes, incluindo Cardápio. |
| `ServicesIntegrationTest` | 40 | DTOs/Bean Validation, BCrypt, login local, propriedade, papéis, inexistência, cadastro próprio, referências mínimas, favoritos, comentários, notas, média e cardápios. |
| `ConcorrenciaServicesTest` | 4 | Requisições simultâneas por e-mail, Place ID, favorito e avaliação. Exige uma só gravação lógica e trata o conflito da requisição concorrente. |
| `RegrasServiceUnitTest` | 4 | Favorito duplicado sem gravação, corrida de Place ID sem recuperação na transação inválida, média delegada ao Repository e sanitização da mensagem de falha. |
| `RestricoesPersistenciaTest` | 5 | Unicidade de e-mail, Place ID e pares usuário/estabelecimento diretamente no banco; sensibilidade de caixa do Place ID. |

**Resultado final: 60 testes aprovados, zero falhas, zero erros, nenhum ignorado.** `mvn clean verify` compila com o alvo Java 17 do projeto (JDK 21 no ambiente), usa Spring Boot 4.1.1 e gera o JAR executável. Violações de unicidade nos logs de testes são esperadas nos cenários negativos e não indicam falha da suíte. `git diff --check` sem problemas.

Durante o desenvolvimento, um teste unitário inicialmente não compilou por usar uma sobrecarga inexistente de uma asserção do AssertJ. A asserção foi corrigida antes da validação final; não há testes falhando no resultado entregue.

Todos os testes usam H2 em memória e o perfil `test`; os dados reais do MySQL não foram acessados ou alterados. A migração MySQL não foi executada. A aprovação desses testes não demonstra funcionamento do login, OAuth2 ou das interações no site.

## E. Pendências

1. Revisar/aplicar manualmente a migração sobre uma cópia do MySQL e resolver eventuais duplicidades sem exclusão automática. A unicidade e a collation binária de `google_place_id` são necessárias também no MySQL; `ddl-auto=validate` não valida sozinho todos os índices/collations.
2. Conferir a URL de conexão de produção: a configuração existente aponta para `localhost:8080/aponte`, porta que precisa corresponder ao mapeamento real do MySQL (não foi presumida nem trocada por 3306). Credenciais não foram copiadas para a documentação.
3. Provisionar administradores com hashes BCrypt e redefinir senhas legadas incompatíveis. Não há recuperação de senha, verificação de e-mail ou interface nova nesta entrega.
4. Configurar OAuth2 Google, caso adotado: client registration, segredo em ambiente seguro e associação de identidade verificada a uma conta local. A existência do link e da dependência não constitui essa configuração. Não inferir papel administrativo pelo e-mail do provedor.
5. Desenvolver Controllers, autorização de rotas e tratamento HTTP de exceções. A rota pública de cadastro deverá ser configurada conscientemente na cadeia de segurança, mantendo CSRF conforme o mecanismo de autenticação escolhido.
6. Conectar o JavaScript às rotas futuras. Enviar `Place.id`/`event.placeId` como `googlePlaceId`, nunca como ID numérico, e combinar os dados próprios retornados com os detalhes atualizados do Google. Favoritos/avaliações não devem enviar um ID arbitrário para definir o usuário atuante.
7. Não foi testada integração real com Google, MySQL ou páginas do site. Não há afirmação de integração completa com o front-end.

## F. Próxima etapa: Controllers previstos

Os endpoints abaixo são **propostas de contrato**, não rotas implementadas. Nenhum Controller foi completado nesta etapa. `EstabalecimentosController` tem um erro de grafia no nome existente; a correção poderá acompanhar a implementação futura, sem impactar esta entrega.

| Controller | Principais endpoints previstos | Acesso |
|---|---|---|
| `UsuarioController` | `POST /api/usuarios`, `GET/PATCH /api/me`, `PUT /api/me/senha` | Cadastro público configurado explicitamente; perfil/senha do próprio usuário. |
| `EstabelecimentosController` | `GET /api/estabelecimentos`, `GET /api/estabelecimentos/{id}`, `GET /api/estabelecimentos/google/{placeId}` | Consultas dos registros internos, sem substituir a busca do Places. |
| `FavoritosController` | `GET/POST /api/me/favoritos`, `DELETE /api/me/favoritos?id=...` ou `?googlePlaceId=...` | Usuário autenticado; exatamente um identificador de estabelecimento. |
| `AvaliacaoController` | `GET /api/avaliacoes?googlePlaceId=...` (ou `estabelecimentoId`), `GET /api/avaliacoes/resumo?...`, `GET /api/me/avaliacoes`, `POST /api/me/avaliacoes`, `PATCH/DELETE /api/me/avaliacoes/{id}` | Consulta pública por estabelecimento; autoria obtida da sessão autenticada para escritas. |
| `CardapioController` | `GET /api/cardapios?googlePlaceId=...` (ou `estabelecimentoId`), `GET /api/cardapios/{id}` | Consultas públicas. |
| `AdministradorController` | `GET /api/admin/usuarios`, `GET/PATCH/DELETE /api/admin/usuarios/{id}`, `GET/POST /api/admin/estabelecimentos`, `PATCH/DELETE /api/admin/estabelecimentos/{id}`, `POST /api/admin/cardapios`, `PATCH/DELETE /api/admin/cardapios/{id}`, `DELETE /api/admin/avaliacoes/{id}` | Somente administradores; delegação aos Services existentes. |

Bodies de criação de avaliação/cardápio combinarão uma `ReferenciaEstabelecimentoDTO` e o DTO de dados correspondente. O Controller deve receber apenas campos permitidos, validar entradas e devolver os DTOs de resposta. Não deve aceitar campos de papel, usuário autor, origem Google ou hashes que permitam contornar as regras dos Services.
