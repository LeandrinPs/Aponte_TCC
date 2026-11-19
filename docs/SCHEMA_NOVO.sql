-- Somente para um banco MySQL 8 NOVO e vazio. Não migra tabelas existentes.
-- Selecione explicitamente o banco de destino antes de executar.
CREATE TABLE adm (
 id_adm BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(50) NOT NULL, senhahash VARCHAR(100) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE usuario (
 id_user BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(50) NOT NULL, email VARCHAR(50) NOT NULL,
 cidade VARCHAR(100) NULL, estado VARCHAR(2) NULL, foto_perfil VARCHAR(100) NULL,
 criado_em TIMESTAMP(6) NULL, google_sub VARCHAR(255) COLLATE utf8mb4_bin NULL,
 senha VARCHAR(100) NULL, UNIQUE(google_sub), CONSTRAINT uk_usuario_email UNIQUE(email)
) ENGINE=InnoDB;
CREATE TABLE estabelecimentos (
 id_estabelecimento BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 google_place_id VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
 foto_principal VARCHAR(100) NULL, foto_2 VARCHAR(100) NULL, foto_3 VARCHAR(100) NULL,
 categoria_principal VARCHAR(30) NULL, tags_filtros VARCHAR(200) NULL, icone VARCHAR(30) NULL,
 nome VARCHAR(50) NULL, descricao VARCHAR(500) NULL, rua VARCHAR(100) NULL,
 numero VARCHAR(10) NULL, bairro VARCHAR(100) NULL, cidade VARCHAR(100) NULL,
 estado VARCHAR(100) NULL, cep VARCHAR(20) NULL,
 latitude VARCHAR(50) NULL, longitude VARCHAR(50) NULL,
 CONSTRAINT uk_estabelecimento_google_place_id UNIQUE(google_place_id)
) ENGINE=InnoDB;
CREATE TABLE favoritos (
 id_favorito BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 id_user BIGINT NOT NULL, id_estabelecimento BIGINT NOT NULL,
 CONSTRAINT uk_favorito_usuario_estabelecimento UNIQUE(id_user,id_estabelecimento),
 FOREIGN KEY(id_user) REFERENCES usuario(id_user),
 FOREIGN KEY(id_estabelecimento) REFERENCES estabelecimentos(id_estabelecimento)
) ENGINE=InnoDB;
CREATE TABLE avaliacao (
 id_avaliacao BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 id_user BIGINT NOT NULL, id_estabelecimento BIGINT NOT NULL,
 criado_em TIMESTAMP(6) NULL, nota INT NOT NULL, comentario VARCHAR(1000) NULL,
 CONSTRAINT uk_avaliacao_usuario_estabelecimento UNIQUE(id_user,id_estabelecimento),
 FOREIGN KEY(id_user) REFERENCES usuario(id_user),
 FOREIGN KEY(id_estabelecimento) REFERENCES estabelecimentos(id_estabelecimento)
) ENGINE=InnoDB;
CREATE TABLE cardapio (
 id_cardapio BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 id_estabelecimento BIGINT NOT NULL,
 nome VARCHAR(50) NOT NULL, descricao VARCHAR(500) NOT NULL, preco DECIMAL(10,2) NOT NULL,
 FOREIGN KEY(id_estabelecimento) REFERENCES estabelecimentos(id_estabelecimento)
) ENGINE=InnoDB;
