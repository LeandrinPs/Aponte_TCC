-- Migração MANUAL após backup e confirmação de que MIGRACAO_SERVICE.sql já foi aplicada.
-- Confira SHOW CREATE TABLE estabelecimentos; não repita se a coluna já existir.
ALTER TABLE estabelecimentos ADD COLUMN foto_principal VARCHAR(100) NULL;
-- Não há remoção de tabelas, colunas ou dados. Os arquivos ficam em APONTE_UPLOADS_DIR.
