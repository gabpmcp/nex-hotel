/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
    // Crear la extensión pgcrypto si no existe
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await knex.schema.createTable('events', (table) => {
        table.uuid('event_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('aggregate_id').notNullable();
        table.string('event_type', 100).notNullable();
        table.jsonb('event_data').notNullable();
        table.timestamp('occurred_at', { useTz: true }).defaultTo(knex.fn.now());
        table.jsonb('metadata');
        table.integer('version').notNullable().defaultTo(1);
        table.boolean('processed').notNullable().defaultTo(false);
    });

    // Índices para mejorar las consultas
    await knex.schema.table('events', (table) => {
        table.index(['aggregate_id'], 'idx_events_aggregate_id');
        table.index(['event_type'], 'idx_events_event_type');
        table.index(['occurred_at'], 'idx_events_occurred_at');
        table.index('event_data', 'idx_events_data', 'gin');
        table.index('metadata', 'idx_events_metadata', 'gin');
    });
};

export const down = async (knex) => {
    await knex.schema.dropTable('events');
};
