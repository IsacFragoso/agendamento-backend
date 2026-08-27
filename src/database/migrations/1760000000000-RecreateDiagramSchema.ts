import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecreateDiagramSchema1760000000000 implements MigrationInterface {
  name = 'RecreateDiagramSchema1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "usuario" (
        "id_usuario" SERIAL NOT NULL,
        "nome_completo" varchar(255) NOT NULL,
        "email" varchar(255) NOT NULL,
        "telefone" varchar(50),
        "data_nascimento" date,
        "tipo_conta" varchar(50) NOT NULL,
        "senha_hash" varchar(255) NOT NULL,
        "ativo" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_usuario" PRIMARY KEY ("id_usuario"),
        CONSTRAINT "UQ_usuario_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "perfil_prestador" (
        "id_prestador" integer NOT NULL,
        "latitude" decimal(10,8),
        "longitude" decimal(11,8),
        "foto_perfil" text,
        "bio" text,
        "dias_atendimento" varchar(100),
        "horario_inicio" time,
        "horario_fim" time,
        CONSTRAINT "PK_perfil_prestador" PRIMARY KEY ("id_prestador"),
        CONSTRAINT "FK_perfil_prestador_usuario" FOREIGN KEY ("id_prestador") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "categoria" (
        "id_categoria" SERIAL NOT NULL,
        "nome" varchar(150) NOT NULL,
        CONSTRAINT "PK_categoria" PRIMARY KEY ("id_categoria"),
        CONSTRAINT "UQ_categoria_nome" UNIQUE ("nome")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "servico" (
        "id_servico" SERIAL NOT NULL,
        "titulo" varchar(255) NOT NULL,
        "descricao" text,
        "preco" decimal(10,2) NOT NULL,
        "duracao_padrao" integer NOT NULL,
        "ativo" boolean NOT NULL DEFAULT true,
        "id_prestador" integer NOT NULL,
        "id_categoria" integer NOT NULL,
        CONSTRAINT "PK_servico" PRIMARY KEY ("id_servico"),
        CONSTRAINT "FK_servico_prestador" FOREIGN KEY ("id_prestador") REFERENCES "perfil_prestador"("id_prestador") ON DELETE CASCADE,
        CONSTRAINT "FK_servico_categoria" FOREIGN KEY ("id_categoria") REFERENCES "categoria"("id_categoria") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "agendamento" (
        "id_agendamento" SERIAL NOT NULL,
        "data_hora_inicio" timestamp NOT NULL,
        "data_hora_fim" timestamp NOT NULL,
        "status" varchar(50) NOT NULL DEFAULT 'PENDENTE',
        "data_criacao" timestamp NOT NULL DEFAULT now(),
        "id_cliente" integer NOT NULL,
        "id_prestador" integer NOT NULL,
        "id_servico" integer NOT NULL,
        CONSTRAINT "PK_agendamento" PRIMARY KEY ("id_agendamento"),
        CONSTRAINT "FK_agendamento_cliente" FOREIGN KEY ("id_cliente") REFERENCES "usuario"("id_usuario") ON DELETE CASCADE,
        CONSTRAINT "FK_agendamento_prestador" FOREIGN KEY ("id_prestador") REFERENCES "perfil_prestador"("id_prestador") ON DELETE CASCADE,
        CONSTRAINT "FK_agendamento_servico" FOREIGN KEY ("id_servico") REFERENCES "servico"("id_servico") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "avaliacao" (
        "id_avaliacao" SERIAL NOT NULL,
        "nota_estrelas" integer NOT NULL,
        "comentario" text,
        "data" date NOT NULL DEFAULT CURRENT_DATE,
        "id_agendamento" integer NOT NULL,
        CONSTRAINT "PK_avaliacao" PRIMARY KEY ("id_avaliacao"),
        CONSTRAINT "UQ_avaliacao_agendamento" UNIQUE ("id_agendamento"),
        CONSTRAINT "CK_avaliacao_nota" CHECK ("nota_estrelas" BETWEEN 1 AND 5),
        CONSTRAINT "FK_avaliacao_agendamento" FOREIGN KEY ("id_agendamento") REFERENCES "agendamento"("id_agendamento") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "avaliacao" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "agendamento" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "servico" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "categoria" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "perfil_prestador" CASCADE');
    await queryRunner.query('DROP TABLE IF EXISTS "usuario" CASCADE');
  }
}
