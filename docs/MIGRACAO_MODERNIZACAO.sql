-- Modernização: executar após MIGRACAO_SERVICE.sql e MIGRACAO_CONTROLLERS.sql.
-- MySQL 8. Selecione o banco explicitamente. Faça backup e revise antes de aplicar.
-- DDL tem commit implícito. Este script não apaga registros, tabelas ou arquivos.
-- Pode ser reaplicado: cada coluna/índice é conferido em information_schema.
-- Datas antigas permanecem NULL. Sem DEFAULT CURRENT_TIMESTAMP e sem UPDATE de backfill.

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuario' AND column_name='cidade'), 'SELECT 1', 'ALTER TABLE usuario ADD COLUMN cidade VARCHAR(100) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuario' AND column_name='estado'), 'SELECT 1', 'ALTER TABLE usuario ADD COLUMN estado VARCHAR(2) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuario' AND column_name='foto_perfil'), 'SELECT 1', 'ALTER TABLE usuario ADD COLUMN foto_perfil VARCHAR(100) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuario' AND column_name='criado_em'), 'SELECT 1', 'ALTER TABLE usuario ADD COLUMN criado_em TIMESTAMP(6) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuario' AND column_name='google_sub'), 'SELECT 1', 'ALTER TABLE usuario ADD COLUMN google_sub VARCHAR(255) COLLATE utf8mb4_bin NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='avaliacao' AND column_name='criado_em'), 'SELECT 1', 'ALTER TABLE avaliacao ADD COLUMN criado_em TIMESTAMP(6) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='foto_2'), 'SELECT 1', 'ALTER TABLE estabelecimentos ADD COLUMN foto_2 VARCHAR(100) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='foto_3'), 'SELECT 1', 'ALTER TABLE estabelecimentos ADD COLUMN foto_3 VARCHAR(100) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='categoria_principal'), 'SELECT 1', 'ALTER TABLE estabelecimentos ADD COLUMN categoria_principal VARCHAR(30) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='tags_filtros'), 'SELECT 1', 'ALTER TABLE estabelecimentos ADD COLUMN tags_filtros VARCHAR(200) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='icone'), 'SELECT 1', 'ALTER TABLE estabelecimentos ADD COLUMN icone VARCHAR(30) NULL');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;

-- Hashes locais são preservados. Senha NULL identifica contas exclusivas do OAuth2.
ALTER TABLE usuario MODIFY COLUMN senha VARCHAR(100) NULL;
SET @ddl = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='usuario' AND column_name='google_sub' AND non_unique=0), 'SELECT 1', 'ALTER TABLE usuario ADD CONSTRAINT uk_usuario_google_sub UNIQUE(google_sub)');
PREPARE migracao FROM @ddl; EXECUTE migracao; DEALLOCATE PREPARE migracao;
