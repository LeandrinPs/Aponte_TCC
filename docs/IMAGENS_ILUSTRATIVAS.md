# Imagens ilustrativas por categoria e cadastro sem fotografia

Implementação sobre `origin/master` (`f9a710f`), em 23/11/2026. O trabalho anterior
foi preservado. Não há migração, alteração de entidades, tabelas, relacionamentos,
IDs internos ou Google Place IDs.

## Comportamento entregue

- As 13 categorias existentes têm ilustrações SVG locais, consistentes por
  categoria. Categoria desconhecida usa `restaurantes.svg`.
- Fotografias reais têm prioridade. Ausência, lista vazia, URI vazio, exceção no
  `getURI` ou erro HTTP/carregamento resultam em ilustração, identificada como
  **Imagem ilustrativa** no texto e no `alt`.
- Créditos fotográficos do Google só são inseridos após o carregamento de uma
  fotografia do Google. Na ilustração, não aparecem marca ou autores fotográficos
  do Google. As demais indicações de origem dos dados/mapa permanecem intactas.
- Início, resultados do mapa, detalhes, favoritos e atividades recentes reutilizam
  os mesmos auxiliares de apresentação. Favoritos e atividades solicitam também
  `types`/`primaryType` nos detalhes transitórios do Places para classificar o lugar;
  isso não altera configuração de API nem persiste esses dados.
- A galeria mantém até três fotos. Fotos que falham são ignoradas na navegação;
  se nenhuma carregar, resta uma ilustração, sem setas ou contador. Uma única foto
  válida também dispensa controles. Callbacks antigos não sobrescrevem a imagem
  nem os créditos da seleção atual.
- O formulário começa em **Sem fotografia** para cadastro novo. Na edição, fotos
  existentes selecionam **Adicionar fotografias**. Sem alterações, seus nomes e
  arquivos são preservados. Posições vazias mostram ícone/mensagem, sem imagem
  genérica ou ilustração fingindo ser uma foto cadastrada.
- Escolher **Sem fotografia** apenas prepara a intenção. Ao salvar um registro
  com fotos, uma confirmação explícita antecede a remoção; cancelar preserva os
  dados e os arquivos. Uploads, substituições, remoção individual, troca de
  principal e validações existentes continuam disponíveis no modo de adição.
- A remoção em lote passa pelo novo `DELETE /api/admin/estabelecimentos/{id}/fotos`.
  O Service usa o bloqueio e a autorização administrativos existentes, limpa
  somente os três campos de foto na mesma transação e reutiliza
  `ImagensService.removerAposConfirmacao` para apagar arquivos após o commit.
  Não remove/recria o estabelecimento. A resposta é o DTO atualizado.

A ilustração é exclusivamente uma decisão de apresentação. O DTO legado ainda
pode retornar `/img/imagem.jpeg` quando não há foto; o auxiliar central reconhece
esse valor como ausência de fotografia, mantendo compatibilidade com clientes
existentes. Nenhuma ilustração é gravada em `foto_principal`, `foto_2` ou `foto_3`.

O salvamento dos dados e os uploads/remoção continuam sendo requisições separadas,
como no fluxo existente. Se uma operação de fotos falhar depois de salvar os
dados, a interface informa esse resultado parcial e permite tentar novamente.
A remoção das três referências em si é atômica. Se o sistema de arquivos recusar
uma exclusão após commit, o mecanismo existente registra a falha no log; os dados
do estabelecimento continuam preservados.

## Arquivos envolvidos

| Arquivos | Finalidade |
| --- | --- |
| `static/img/ilustrativas/*.svg` | 13 desenhos vetoriais locais, 800 × 480 |
| `static/img/ilustrativas/README.md` | Relação de imagens, origem e licença CC0 1.0 |
| `static/js/app.js` | Escolha por categoria, prioridade, erros, créditos e galeria compartilhados |
| `static/js/map.js` | Categoria nas fotos dos resultados e detalhes; cache de URI reaproveitado no auxiliar central |
| `static/js/favoritos.js`, `static/js/comunidade.js` | Fotos/ilustrações e categorias nas outras listagens |
| `static/js/admin-form.js` | Modos de fotografia, prévias vazias e confirmação de remoção |
| `templates/admin/formulario.html` | Seleção dos modos e estrutura das prévias |
| `static/css/admin.css`, `static/css/integracao.css` | Estado sem fotografia e legenda discreta |
| `Service/EstabelecimentosService.java`, `Controller/AdministradorController.java` | Remoção administrativa em lote sem alterar cadastro ou vínculos |
| `ControllersIntegrationTest.java` | Novos testes de integridade, autorização, CSRF, ausência e referência Google |
| `ImagensNavegadorIT.java`, `tests/browser/ilustrativas.cjs` | Fluxo HTTP/UI real com H2 e contrato Google simulado |
| `tests/browser/{fluxo,modernizacao,desfazer,mapa-simulado}.cjs` | Adequação dos cenários anteriores à seleção explícita de upload e nova ilustração |

Os caminhos abreviados de produção são relativos a `src/main/resources/`, exceto
os Java, relativos a `src/main/java/com/aponte/`. Testes Java estão em
`src/test/java/com/aponte/`.

## Origem e licença das ilustrações

Todos os SVGs são desenhos originais produzidos para o projeto com formas
geométricas, sem incorporar imagens ou fontes externas. Somente os 13 SVGs novos
são disponibilizados sob **CC0 1.0 Universal**, sem atribuição obrigatória. A tabela
com cada arquivo/composição e as condições estão no
[README das ilustrações](../src/main/resources/static/img/ilustrativas/README.md).
Não há cópias de fotos do Google nem URLs externas de imagens de fallback.

## Testes executados

Ambiente: JDK 21.0.2, Maven 3.9.9, Node e Playwright 1.62.1, Chromium headless.

| Verificação | Resultado |
| --- | --- |
| `mvn test` | 57 testes Java aprovados; inclui os 55 existentes e 2 novos |
| `node --test tests/frontend/*.test.cjs` | 5 testes existentes aprovados |
| `mvn -Dtest=ImagensNavegadorIT test` | 1 teste de integração com navegador aprovado; verificações detalhadas abaixo |
| `mvn -DskipTests package` | Compilação e empacotamento aprovados |
| `git diff --check` e verificação sintática dos JavaScript alterados | Aprovados |
| Comparação byte a byte e SHA-256 de `application.properties` | Idêntico à base |

A suíte de navegador usa o **perfil H2 de testes já existente**, porta aleatória,
usuários fictícios e pasta temporária de uploads. O teste ajusta apenas o caminho
isolado de armazenamento dentro do contexto de teste. Não altera nenhum arquivo
`application*.properties`, variável de ambiente ou configuração das APIs. Não
inicia a aplicação contra o MySQL configurado. Requer Node, dependências de
`tests/browser/package.json` e Chromium em `/usr/bin/chromium`; execução opcional
explícita por `-Dtest=ImagensNavegadorIT`, fora da seleção padrão do Surefire.

Cobertura observada no navegador:

1. Google sem `photos`, `null`, `[]`, URI vazio, exceção ou URL quebrada: categoria
   correta, rótulo ilustrativo e ausência de créditos fotográficos.
2. Google com três fotos simuladas: fotos carregadas, créditos por autor e navegação.
3. Próprio com três uploads reais: principal/galeria preservadas ao editar só os dados.
4. Próprio sem foto, e próprio com URL de foto abortada: ilustração, sem alterar o banco.
5. Cadastro pela interface em **Sem fotografia** salva sem upload nem ilustração persistida.
6. Edição sem alterações de imagens mantém exatamente os três URLs existentes.
7. Escolher o modo e cancelar a confirmação mantém os arquivos acessíveis. Confirmar
   limpa as três referências, torna os arquivos antigos indisponíveis (404), mantém
   ID, favoritos, avaliações, comentários e média.
8. Alterar a categoria muda a ilustração sem recriar o registro.
9. Favoritar/desfavoritar por API e interface; referências próprias e Google preservadas.
10. Criar, editar, consultar média e excluir avaliações próprias e Google funciona.
11. Início/atividades, favoritos, resultados e painéis em 1440, 768 e 390 px: imagens
    visíveis carregadas e ausência de overflow horizontal. Galeria com todas as fotos
    quebradas mostra uma ilustração; com uma válida, mostra essa foto sem controles.
12. As 13 ilustrações e a alternativa genérica são servidas localmente como SVG.
    Callbacks de carregamentos antigos não repõem créditos sobre a ilustração atual.

O resultado detalhado e as capturas são gerados em `tests/browser/artifacts/`
(ignorados pelo Git); o log do processo de navegador fica em
`target/ilustrativas-browser.log`. Os testes anteriores de navegador foram
adaptados, mas suas cinco suítes completas não foram reexecutadas nesta entrega.
Os fluxos acima foram executados pela nova suíte isolada.

**Limite da validação:** o SDK e as fotos do Google foram simulados explicitamente.
Não se afirma validação com fotos reais retornadas pela API, cobrança ou
credenciais Google. Upload, sessão, autorização, CSRF, persistência H2 e exclusão
física de fotos foram exercitados no Spring real. Não foi executada migração nem
alteração de dados no MySQL.

## Configurações preservadas

**`src/main/resources/application.properties` não foi modificado.** Sua comparação
byte a byte com `origin/master` é idêntica. SHA-256 antes/depois:

```text
1e3a168ce09016f22699f05f0b622c537310bc13b430d1ad750d92f9693c7671
```

Nenhum novo `application-*.properties` foi criado. O perfil de testes existente
permanece inalterado, assim como configurações de segurança, credenciais, Google
Maps, banco, faturamento e variáveis de ambiente da aplicação.
