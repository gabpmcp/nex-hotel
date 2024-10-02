DROP TABLE IF EXISTS events;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    occurred_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}',
    version INT NOT NULL DEFAULT 1,
    processed BOOLEAN NOT NULL DEFAULT false
);

-- Índices simples
CREATE INDEX idx_events_aggregate_id ON events (aggregate_id);
CREATE INDEX idx_events_event_type ON events (event_type);
CREATE INDEX idx_events_occurred_at ON events (occurred_at);
CREATE INDEX idx_events_data ON events USING gin (event_data);
CREATE INDEX idx_events_metadata ON events USING gin (metadata);

-- Índice compuesto en aggregate_id y version
CREATE INDEX idx_aggregate_version ON events (aggregate_id, version);
