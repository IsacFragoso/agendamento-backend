-- Canonical schema for the current NestJS/TypeORM model.
-- Existing deployments must be upgraded with reviewed TypeORM migrations, not this bootstrap DDL.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "usuario" (
    "id_usuario" SERIAL PRIMARY KEY,
    "nome_completo" varchar(255) NOT NULL,
    "email" varchar(255) NOT NULL CONSTRAINT "UQ_usuario_email" UNIQUE,
    "telefone" varchar(50),
    "data_cadastro" timestamptz NOT NULL DEFAULT now(),
    "foto_perfil" text,
    "tipo_conta" varchar(50) NOT NULL,
    "senha_hash" varchar(255) NOT NULL,
    "deleted_at" timestamptz
);

CREATE TABLE "perfil_prestador" (
    "id_usuario" integer PRIMARY KEY,
    "latitude" decimal(10,8),
    "longitude" decimal(11,8),
    "bio" text,
    "cidade" varchar(100),
    "estado" varchar(2),
    "imagem_banner" text,
    CONSTRAINT "FK_perfil_prestador_usuario" FOREIGN KEY ("id_usuario")
        REFERENCES "usuario"("id_usuario") ON DELETE CASCADE
);

CREATE TABLE "categoria" (
    "id_categoria" SERIAL PRIMARY KEY,
    "nome" varchar(150) NOT NULL CONSTRAINT "UQ_categoria_nome" UNIQUE
);

CREATE TABLE "servico" (
    "id_servico" SERIAL PRIMARY KEY,
    "titulo" varchar(255) NOT NULL,
    "descricao" text,
    "preco" decimal(10,2) NOT NULL,
    "duracao_padrao" integer NOT NULL,
    "ativo" boolean NOT NULL DEFAULT true,
    "id_prestador" integer NOT NULL,
    "id_categoria" integer NOT NULL,
    CONSTRAINT "UQ_servico_id_prestador" UNIQUE ("id_servico", "id_prestador"),
    CONSTRAINT "CK_servico_preco_nonnegative" CHECK ("preco" >= 0),
    CONSTRAINT "CK_servico_duracao_positive" CHECK ("duracao_padrao" > 0),
    CONSTRAINT "FK_servico_prestador" FOREIGN KEY ("id_prestador")
        REFERENCES "perfil_prestador"("id_usuario") ON DELETE CASCADE,
    CONSTRAINT "FK_servico_categoria" FOREIGN KEY ("id_categoria")
        REFERENCES "categoria"("id_categoria")
);

CREATE TABLE "horarios" (
    "id_horario" SERIAL PRIMARY KEY,
    "dia_semana" smallint NOT NULL,
    "hora_inicio" time NOT NULL,
    "hora_fim" time NOT NULL,
    "id_prestador" integer NOT NULL,
    CONSTRAINT "UQ_horarios_provider_interval"
        UNIQUE ("id_prestador", "dia_semana", "hora_inicio", "hora_fim"),
    CONSTRAINT "CK_horarios_dia" CHECK ("dia_semana" BETWEEN 0 AND 6),
    CONSTRAINT "CK_horarios_intervalo" CHECK ("hora_inicio" < "hora_fim"),
    CONSTRAINT "FK_horarios_prestador" FOREIGN KEY ("id_prestador")
        REFERENCES "perfil_prestador"("id_usuario") ON DELETE CASCADE
);

CREATE TABLE "agendamento" (
    "id_agendamento" SERIAL PRIMARY KEY,
    "data_hora_inicio" timestamp NOT NULL,
    "data_hora_fim" timestamp NOT NULL,
    "status" varchar(50) NOT NULL DEFAULT 'PENDENTE',
    "data_criacao" timestamp NOT NULL DEFAULT now(),
    "id_cliente" integer NOT NULL,
    "id_prestador" integer NOT NULL,
    "id_servico" integer NOT NULL,
    CONSTRAINT "CK_agendamento_intervalo" CHECK ("data_hora_fim" > "data_hora_inicio"),
    CONSTRAINT "CK_agendamento_status"
        CHECK ("status" IN ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'CONCLUIDO')),
    CONSTRAINT "EX_agendamento_prestador_sem_sobreposicao"
        EXCLUDE USING gist ("id_prestador" WITH =, tsrange("data_hora_inicio", "data_hora_fim") WITH &&)
        WHERE ("status" <> 'CANCELADO'),
    CONSTRAINT "EX_agendamento_cliente_sem_sobreposicao"
        EXCLUDE USING gist ("id_cliente" WITH =, tsrange("data_hora_inicio", "data_hora_fim") WITH &&)
        WHERE ("status" <> 'CANCELADO'),
    CONSTRAINT "FK_agendamento_cliente" FOREIGN KEY ("id_cliente")
        REFERENCES "usuario"("id_usuario"),
    CONSTRAINT "FK_agendamento_prestador" FOREIGN KEY ("id_prestador")
        REFERENCES "perfil_prestador"("id_usuario"),
    CONSTRAINT "FK_agendamento_servico_prestador"
        FOREIGN KEY ("id_servico", "id_prestador")
        REFERENCES "servico"("id_servico", "id_prestador")
);

CREATE TABLE "avaliacao" (
    "id_avaliacao" SERIAL PRIMARY KEY,
    "nota_estrelas" integer NOT NULL,
    "comentario" text,
    "data" date NOT NULL DEFAULT CURRENT_DATE,
    "id_agendamento" integer NOT NULL CONSTRAINT "UQ_avaliacao_agendamento" UNIQUE,
    CONSTRAINT "CK_avaliacao_nota" CHECK ("nota_estrelas" BETWEEN 1 AND 5),
    CONSTRAINT "FK_avaliacao_agendamento" FOREIGN KEY ("id_agendamento")
        REFERENCES "agendamento"("id_agendamento") ON DELETE CASCADE
);

CREATE TABLE "revoked_tokens" (
    "id" SERIAL PRIMARY KEY,
    "token" text NOT NULL CONSTRAINT "UQ_revoked_tokens_token" UNIQUE,
    "expires_at" timestamptz NOT NULL
);

CREATE INDEX "IDX_revoked_tokens_expires_at" ON "revoked_tokens"("expires_at");