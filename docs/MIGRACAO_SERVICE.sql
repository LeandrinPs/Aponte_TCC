-- APONTE: roteiro MANUAL para uma cópia validada do MySQL 8.
-- Este arquivo em docs não é executado pela aplicação ou pelos testes.
-- Faça backup, confirme o banco selecionado e compare SHOW CREATE TABLE antes de executar.
-- Se qualquer consulta de duplicidades retornar linhas, PARE e resolva os conflitos
-- segundo as regras do projeto. Não há limpeza automática de dados neste roteiro.
-- Não repita os ALTERs sem conferir se colunas/índices já existem.

SELECT DATABASE();
SHOW CREATE TABLE usuario;
SHOW CREATE TABLE estabelecimentos;
SHOW CREATE TABLE favoritos;
SHOW CREATE TABLE avaliacao;

SELECT LOWER(TRIM(email)) AS email_normalizado, COUNT(*) AS quantidade
FROM usuario GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1;
SELECT id_user, id_estabelecimento, COUNT(*) AS quantidade
FROM favoritos GROUP BY id_user, id_estabelecimento HAVING COUNT(*) > 1;
SELECT id_user, id_estabelecimento, COUNT(*) AS quantidade
FROM avaliacao GROUP BY id_user, id_estabelecimento HAVING COUNT(*) > 1;
SELECT nome, COUNT(*) AS quantidade FROM adm GROUP BY nome HAVING COUNT(*) > 1;

-- Só após revisar o resultado acima, aplicar em janela de manutenção.
-- Se já houver google_place_id por outra mudança, confira seus valores/índice
-- e adapte o roteiro sem adicionar novamente a coluna.
ALTER TABLE estabelecimentos
    ADD COLUMN google_place_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
    ADD CONSTRAINT uk_estabelecimento_google_place_id UNIQUE (google_place_id),
    MODIFY COLUMN nome VARCHAR(50) NULL,
    MODIFY COLUMN descricao VARCHAR(500) NULL,
    MODIFY COLUMN rua VARCHAR(100) NULL,
    MODIFY COLUMN numero VARCHAR(10) NULL,
    MODIFY COLUMN bairro VARCHAR(100) NULL,
    MODIFY COLUMN cidade VARCHAR(100) NULL,
    MODIFY COLUMN estado VARCHAR(100) NULL,
    MODIFY COLUMN cep VARCHAR(20) NULL,
    MODIFY COLUMN latitude VARCHAR(50) NULL,
    MODIFY COLUMN longitude VARCHAR(50) NULL;

ALTER TABLE usuario
    MODIFY COLUMN senha VARCHAR(100) NOT NULL,
    ADD CONSTRAINT uk_usuario_email UNIQUE (email);

ALTER TABLE favoritos
    ADD CONSTRAINT uk_favorito_usuario_estabelecimento UNIQUE (id_user, id_estabelecimento);

ALTER TABLE avaliacao
    ADD COLUMN comentario VARCHAR(1000) NULL,
    ADD CONSTRAINT uk_avaliacao_usuario_estabelecimento UNIQUE (id_user, id_estabelecimento);

-- IDs, tabelas e dados existentes são preservados. Registros antigos com
-- google_place_id NULL continuam sendo cadastros próprios.
-- Garanta uma collation do e-mail compatível com a comparação sem distinção
-- de caixa adotada pela aplicação; revise também dados legados com espaços.
-- Não transforme senhas legadas em hashes sem um procedimento autorizado de
-- redefinição. Aumentar a coluna não torna senhas em texto puro seguras.
-- Em produção ddl-auto=validate impede ajuste automático do esquema.
