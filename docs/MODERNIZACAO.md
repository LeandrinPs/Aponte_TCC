# Modernização do Aponte

## Entrega e base preservada

A implementação parte da `master` `f7241a5`, posterior à incorporação do PR de Controllers. Mantém Java 17 / Spring Boot 4.1.1, pacotes existentes, autenticação por sessão, BCrypt, CSRF, Services, APIs, Google Maps/Places New e os cadastros próprios. Não recria o projeto, não reintroduz Horario ou Categoria como entidades e preserva Cardapio. A proposta está em uma branch própria, sem incorporação automática à `master`.

### Navegação e páginas públicas

O cabeçalho compartilhado tem pesquisa ampla, acesso ao mapa e menu por sessão. Na página inicial aparece sobre a fotografia do hero; nas internas usa fundo branco. O menu normal apresenta perfil, favoritos, avaliações, configurações e saída por POST/CSRF; o administrativo apresenta painel e saída. Favoritos e Cardápio não integram a navegação principal.

As cinco categorias da navegação e o dropdown Bootstrap “Mais” encaminham filtros reais ao mapa. A página inicial conserva as seções úteis de convite ao mapa e estabelecimentos próprios, acrescentando o feed limitado de avaliações do Aponte. Skeletons, spinners locais, mensagens de erro/ausência de dados e `prefers-reduced-motion` atendem os carregamentos sem bloquear toda a página.

### Login e cadastro a partir dos anexos

`entra.html` e `formCss.css` fornecidos pelo usuário foram utilizados como base efetiva. Permanecem os seletores `form_container`, `form_header`, `form_title`, `input_container`, `input-field`, `btn-default-exit`, `passwordIcon` e `google-btn`, a cor do cartão, bordas, sombras, ícones, sublinhado do título e composição com a marca à direita. A imagem `onda.png` foi substituída por uma elipse vermelha estática em CSS, sem animações. Grid e regras móveis substituem as margens fixas; o ícone vermelho ao lado do título é um link de voltar ao início, sem enviar formulário. Há botão de envio separado.

O login aceita texto (`e-mail` ou `admin:nome`), preserva o formulário do Spring Security e CSRF. O cadastro inclui confirmação de senha obrigatória e igual à senha no navegador e no servidor; cidade e estado continuam opcionais. A marca Google é servida localmente a partir do SVG oficial usado no anexo. Sem OAuth2 configurado, a área informa indisponibilidade e não apresenta um link de autenticação funcional.

### Perfil e comunidade

`/perfil.html` utiliza perfil privado de `/api/me`, edição, foto própria, cidade/UF opcionais, data de cadastro e contagens efetivas de avaliações/favoritos. As abas mostram avaliações próprias e reutilizam `favoritos.js` e as mesmas APIs de favoritos. A edição da avaliação é feita no mapa já existente; a exclusão própria também pode ser feita no perfil. Senha e vínculo Google ficam nas configurações. Não há senha, hash, sub ou tokens nos DTOs de perfil/sessão.

`GET /api/avaliacoes/recentes` é público e limita a consulta a 12 avaliações, com `join fetch` para autor/estabelecimento. Ordena datas conhecidas decrescentemente, usa o ID como desempate e deixa datas antigas desconhecidas por último. O DTO público tem nome/foto de exibição do autor, nota/comentário/data e referência ao estabelecimento; não inclui ID pessoal ou e-mail. Google Place IDs são resolvidos no navegador quando o SDK está disponível, sem cache permanente dos dados Google no MySQL.

### Mapa e fotografias

O painel mantém as interações existentes em grafite, com 410 px em desktop e disposição vertical em celular. Os estilos do painel estão concentrados em `painel.css`; `map.css` trata mapa, ferramentas e marcadores. Google Maps e Aponte possuem cards independentes de média/quantidade. Um cadastro próprio sem vínculo não recebe nota Google; o vazio interno informa “Ainda não avaliado no Aponte”. Avaliar continua gravando exclusivamente no Aponte.

`Aponte.galeria` mostra até três imagens, setas/counter para duas ou três, uma imagem sem setas e fallback quando não há foto. Fotos Google usam `Photo.getURI()` no navegador; os créditos são trocados junto com a imagem e mantêm os autores e a marca Google Maps. Erro de imagem exibe fallback e informa indisponibilidade. Fotos/URLs temporárias Google não entram no banco.

A seção `cards-proprios` removida pelo grupo não é recriada. Seu acesso é opcional; carregar dados e abrir um cadastro por ID não depende dela. Um seletor de lugares próprios mantém a consulta utilizável mesmo sem SDK. Inicialização, pesquisas e falhas liberam o spinner. Marcadores próprios sobrevivem a novas pesquisas Google. A deduplicação visual por nome/proximidade foi preservada, considerando os próprios compatíveis com o filtro.

Os marcadores Google solicitam `primaryType`/`types` e usam uma tradução controlada para pizzaria, hamburgueria, cafeteria, japonês, churrascaria, brasileira e restaurante genérico. O painel pode utilizar `primaryTypeDisplayName` quando não há tradução específica. Não expõe `food`, `point_of_interest` ou `establishment`. A posição retornada pelo Google e o clique que abre o painel são mantidos.

### Administração

Menu lateral compartilhado em vinho, área clara, indicadores reais e distribuição dos registros próprios/referências Google calculada das contagens existentes. Não há séries de faturamento, likes ou histórico fictício. `/admin/avaliacoes` e `/admin/cardapios` reutilizam a tela e o fluxo de seleção de estabelecimento já existentes para a manutenção de conteúdos. Não há uma nova estrutura administrativa paralela.

O formulário preserva endereço, coordenadas e seleção no mapa; acrescenta categoria principal, tags de filtros, ícone automático ou escolhido de uma lista controlada e prévia. Categoria descreve o lugar; tags permitem sua participação em filtros adicionais; o ícone manual não altera a classificação. O mesmo filtro atende próprios por categoria/tag e Google pelo tipo reconhecido pela Places API.

Três posições de imagem usam `foto_principal`, `foto_2` e `foto_3`; não foi criada outra entidade para um limite fixo de três. O formulário permite prévia local, substituição e remoção de cada posição e troca da principal. A primeira imagem enviada se torna principal. Ao remover a principal, uma foto restante assume a posição. Os endpoints antigos de foto continuam equivalentes à posição 1. O armazenamento e os limites JPEG/PNG, 5 MB, dimensão/pixels e reencodificação reutilizam `ImagensService`. Arquivo novo é limpo no rollback; arquivo substituído/removido somente após commit. A atualização utiliza lock de registro para não perder alterações concorrentes. O mesmo armazenamento atende foto de perfil, sempre do usuário da sessão.

## Arquivos agrupados

| Área | Criados ou modificados |
|---|---|
| Persistência | `Entity/Usuario.java`, `Entity/Avaliacao.java`, `Entity/Estabelecimentos.java`; `Repository/UsuarioRepository.java`, `Repository/AvaliacaoRepository.java` |
| DTOs | `UsuarioDTO.java`, `UsuarioAtualizacaoDTO.java`, `UsuarioCadastroDTO.java`, `AvaliacaoDTO.java`, **`AvaliacaoRecenteDTO.java`**, `EstabelecimentoDTO.java`, `DadosEstabelecimentoDTO.java` |
| Regras e APIs | `Service/UsuarioService.java`, `Service/AvaliacaoService.java`, `Service/EstabelecimentosService.java`; `Controller/UsuarioController.java`, `Controller/AvaliacaoController.java`, `Controller/AdministradorController.java`, `Controller/PaginasController.java` |
| OAuth2 | **`Config/GoogleOAuthConfig.java`**, **`Service/ContasGoogle.java`**, **`Security/IdentidadeGoogle.java`**; `Config/SegurancaConfig.java`, `Security/PrincipalAponte.java`, `Security/AutenticacaoAponte.java` |
| Páginas | `templates/fragmentos.html`, `index.html`, `entra.html`, `forma.html`, **`perfil.html`**, `map.html`, `admin/{index,usuarios,estabelecimentos,formulario}.html`; ajuste de acessibilidade dos ícones de `catalo.html` |
| Interface | `static/js/{app,formJs,favoritos,pesquisa,map,admin,admin-form}.js`, **`perfil.js`**, **`comunidade.js`**; `static/css/{formCss,indexCss,integracao,map,painel}.css`, **`perfil.css`**, **`admin.css`**; **`static/img/avatar.svg`**, **`google-g.svg`** |
| Configuração e banco | `application.properties`, `docs/SCHEMA_NOVO.sql`, **`docs/MIGRACAO_MODERNIZACAO.sql`** |
| Verificação e execução | `ControllersIntegrationTest.java`, **`GoogleOAuthTest.java`**; `tests/browser/{fluxo,mapa-simulado,modernizacao,google-real}.cjs`, `package.json`; `README.md`, `docs/INTEGRACAO.md`, **este relatório** |

Paths Java são relativos a `src/main/java/com/aponte`; os DTOs ficam em `DTO/`. Recursos são relativos a `src/main/resources`. Os arquivos em negrito são novos. Relatórios anteriores de Services e Controllers foram conservados como histórico.

## Banco de dados

Para instalação nova em banco vazio, use `docs/SCHEMA_NOVO.sql`. Para banco existente, revise as migrações anteriores e aplique `docs/MIGRACAO_MODERNIZACAO.sql` manualmente após backup, selecionando explicitamente o banco correto. A aplicação usa `ddl-auto=validate`; não aplica SQL nem remove tabelas/dados automaticamente.

A nova migração consulta `information_schema` antes de adicionar colunas/índice, pode ser reaplicada e preserva a foto principal, contas e vínculos. Adiciona cidade/UF se ausentes, foto de perfil, `google_sub`, fotos 2/3, categoria/tags/ícone e datas de criação. A senha passa a aceitar NULL para contas exclusivas do Google, preservando todos os hashes locais existentes. `google_sub` e Place IDs têm comparação que preserva caixa no esquema MySQL. As datas novas são preenchidas por `@PrePersist`, nunca por atualização geral. Registros antigos permanecem NULL e a interface informa “Data não registrada”. DDL MySQL tem commit implícito, por isso o script contém orientações de revisão e não é apresentado como rollback transacional.

## Configuração externa

| Variável | Uso / padrão |
|---|---|
| `DB_URL` | JDBC MySQL; padrão `jdbc:mysql://localhost:3306/aponte` |
| `DB_USER` ou `DB_USERNAME` | Usuário do banco; padrão `aponte` |
| `DB_PASSWORD` | Senha externa, sem senha padrão |
| `DDL_AUTO` | Padrão `validate`; migrations são manuais |
| `UPLOADS_DIR` ou `APONTE_UPLOADS_DIR` | Diretório gravável e persistente de fotos; padrão `./uploads` |
| `GOOGLE_MAPS_API_KEY` | Chave de navegador restrita à origem/APIs autorizadas |
| `GOOGLE_MAP_ID` ou `GOOGLE_MAPS_MAP_ID` | Map ID; padrão `DEMO_MAP_ID` para desenvolvimento |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth2 Google opcional; ambas necessárias |
| `ADMIN_BOOTSTRAP` ou `APONTE_ADMIN_BOOTSTRAP_ENABLED` | Criação inicial opcional, padrão `false` |
| `ADMIN_NOME` ou `APONTE_ADMIN_NOME` | Nome do administrador inicial |
| `ADMIN_SENHA` ou `APONTE_ADMIN_SENHA` | Senha inicial de pelo menos 12 caracteres, até 72 bytes |

As credenciais fixas da configuração atual foram removidas. O bootstrap continua sem redefinir senha de conta existente. Use valores próprios, não versione `.env`, hashes ou senhas; o histórico anterior de credenciais não é reescrito por esta proposta. Substituir credenciais previamente publicadas é uma ação do responsável no respectivo serviço.

### Configurar e validar OAuth2

1. No Google Cloud, configure a tela de consentimento e um cliente OAuth do tipo aplicação web. Autorize `http://localhost:8080/login/oauth2/code/google` no desenvolvimento e a URL HTTPS equivalente da sua implantação. Não confundir a chave de Maps com o Client Secret OAuth2.
2. Exporte Client ID e Secret e reinicie. A configuração só habilita `oauth2Login` quando os dois existem. Os endpoints conhecidos do Google dispensam descoberta HTTP na inicialização; não há dependência de OAuth para iniciar o login local.
3. Teste com uma conta Google com e-mail verificado e novo no Aponte. O Spring valida assinatura/issuer, state e nonce; `ContasGoogle` exige Google issuer, e-mail verificado e usa o `sub` estável. Cria um Usuario normal com senha NULL e não baixa a foto Google para o servidor.
4. Para uma conta local existente, entre com a senha, abra Perfil → Configurações → Vincular Google e confirme a senha local. O servidor guarda na sessão uma prova de vínculo por cinco minutos; o callback verificado vincula o sub ao mesmo ID interno. Coincidência de e-mail sozinha é recusada, sem anexar favoritos/avaliações de outra conta. Sub já vinculado a outra identidade também é recusado.
5. Saia e teste login Google novamente, confirmando que o mesmo ID/favoritos/avaliações são preservados. Teste também o login local e `admin:nome` de forma independente. IDs administrativos pertencem à entidade separada e não são inferidos do e-mail Google.

O limite preexistente de e-mail (50 caracteres) foi preservado; uma identidade externa que não caiba nesse contrato é recusada. Tokens, senhas e sub não são retornados aos Controllers como dados de perfil. Contas Google sem senha usam OAuth; o login local as recusa. Não foi criada uma senha aleatória ou usada a palavra-passe do provedor.

## APIs acrescentadas e compatibilidade

| Método / rota | Responsabilidade / acesso |
|---|---|
| `GET /api/avaliacoes/recentes` | Feed público, no máximo 12 avaliações |
| `GET/PUT /api/me` | Perfil privado; agora inclui cidade/UF, foto, criação e flags de autenticação |
| `POST/DELETE /api/me/foto` | Foto somente do usuário autenticado, multipart no POST |
| `POST /api/me/google/vinculo` | Confirmar senha e preparar vínculo Google; usuário/CSRF |
| `POST/DELETE /api/admin/estabelecimentos/{id}/fotos/{1..3}` | Manutenção individual, administração/CSRF; multipart no POST |
| `PUT /api/admin/estabelecimentos/{id}/fotos/{1..3}/principal` | Trocar a principal sem duplicar arquivos |
| `POST/PUT /api/admin/estabelecimentos[/{id}]` | Dados próprios; acrescenta `categoria`, `tags` e `icone` controlados |

Cadastro de usuário via HTTP agora exige `confirmacaoSenha`. O endpoint de senha, CRUDs anteriores, APIs de favoritos/avaliações/cardápios e foto legada permanecem. `EstabelecimentoDTO.fotoUrl` continua disponível; `fotos` preserva as três posições com NULL quando vazias. Campos novos ausentes em atualizações antigas não apagam classificação/cidade/UF já cadastradas. Valores vazios explícitos de cidade/UF permitem removê-los. Nenhum DTO transporta uma entidade JPA.

## Verificação executada

### Java e MySQL

- Compilação e suíte Java: **41 testes passaram**, sem falhas ou testes ignorados, em H2 de teste. JDK 21 no ambiente, compilação com `--release 17` conforme o projeto.
- MySQL 8.4 isolado, com esquema manual e `ddl-auto=validate`: **29 testes passaram** (`ControllersIntegrationTest` e `GoogleOAuthTest`), sem falhas/ignorados. Não foi usado o datasource real do projeto.
- Migração de banco antigo aplicada **duas vezes** em outro banco isolado. Verificados conta/hash, foto principal, favorito e avaliação preservados, e datas antigas NULL.
- Cobertura inclui CSRF/papéis, login local/admin, confirmação de senha, perfil privado, avatar, limite/ordem/privacidade do feed, preços/notas e unicidade preexistentes, galerias/posições/troca de principal e rejeição de ícones arbitrários.
- `GoogleOAuthTest` verifica o contrato de uma identidade OIDC já validada: sub estável, coincidência de e-mail recusada, vínculo com senha preservando ID, senha incorreta, e-mail não verificado, sub já ocupado, recusa de login local para conta sem senha, redirect com state/nonce e acesso ao perfil com o principal Google. **Não realiza login de uma conta Google real.**

### Navegador com aplicação e MySQL reais

Chromium, sem ignorar TLS, em 1440×1000 e 390×844. Os três roteiros locais passaram:

- `fluxo.cjs`: login/admin e indicadores; cadastro próprio/foto; cardápio; usuário; favoritos persistidos entre sessões; criar/editar avaliação; conteúdo tratado como texto; autorização; moderação; substituição/remoção de foto após commit; manutenção de usuário; layout móvel.
- `modernizacao.cjs`: confirmação e cadastro; menu por papel; categorias/Mais; três uploads com prévias; categoria/tags/ícone; principal/remoção/substituição individuais e arquivos antigos 404; filtros próprios por categoria/tag; galeria de três fotos; cards de notas separados; perfil/dados/avatar, abas/contagens/favoritos; feed real; remoção do avatar; desktop/celular sem overflow e sem erros JavaScript.
- `mapa-simulado.cjs`: **somente o SDK é substituído explicitamente**. APIs Aponte continuam reais. Verifica filtros Places, marcadores próprios preservados, deduplicação visual, emoji automático/manual, posição/click, categoria amigável, três fotos com créditos distintos, uma foto sem setas, vazio/fallback, Place ID, favoritos/avaliações e notas separadas. Confirma que o DOM não precisa de `cards-proprios`.

As capturas foram inspecionadas e comparadas com as referências, em especial o cartão/curva/ícones do login e a composição de perfil/painel/admin. Artefatos de navegador ficam em `tests/browser/artifacts`, ignorados pelo Git.

### Google real: resultado separado

A tentativa foi repetida neste trabalho com Chromium normal e validação TLS habilitada. O request de script a `maps.googleapis.com` falhou com **`net::ERR_CERT_AUTHORITY_INVALID`**; o SDK não carregou e o mapa Google não iniciou. Nenhuma verificação TLS foi desativada e nenhum certificado foi instalado para contornar a falha. O diagnóstico reproduzível é `npm run test:google`, que registra somente host/status/tipo/erro, sem chave ou URL credenciada; retorna código 2 quando o SDK está indisponível.

Verificação HTTP separada, pela cadeia de confiança normal do sistema: SDK retornou **HTTP 200**, e as consultas reais Places Nearby/Text retornaram **HTTP 200** com Place IDs/tipos. Nas respostas solicitando `photos`, não vieram fotos: uma consulta de 3 lugares na região inicial e consultas de 20 lugares em São Paulo retornaram o campo ausente. Isso não comprova a ausência de fotos na base do Google. Não foi possível validar a entrega da imagem por `Photo.getURI()` no navegador, a aparência do mapa real, nem concluir a análise de restrições específicas de domínio/API a partir dessa falha TLS. A galeria/fotos/atribuições foi validada pelo contrato do SDK substituto, sem apresentar esse resultado como uma validação real das fotografias Google.

Não há Client ID/Secret OAuth2 válidos disponibilizados no ambiente. O fluxo de conta Google real e seu callback externo permanecem **sem validação real**, embora implementação opcional, startup local e contratos de vínculo estejam testados. Não foi apresentado um botão Google ativo nesse ambiente.

## Executar e próxima validação

Use o passo a passo do `README.md`, Java 17 ou superior, MySQL 8, esquema/migração apropriados e as variáveis externas acima. Execute `bash ./mvnw clean verify`. Os testes padrão ficam em H2. Para navegador, inicie a aplicação sobre outro banco isolado e, em `tests/browser`, execute `npm ci` e `npm run test:all` com as credenciais de teste documentadas no README. Os roteiros criam/removem somente suas fixtures; nunca apontar para uma base importante.

No ambiente local com cadeia TLS confiável, execute separadamente `npm run test:google`, confira as APIs habilitadas e restrições da chave para a origem, selecione lugares que retornem fotos e confira cada crédito/counter no painel. Com credenciais OAuth2 válidas, execute os cinco passos de validação acima. Essas validações externas são as pendências verificáveis; não foi substituído o mapa Google nem incluída integração Places de pesquisa no back-end.
