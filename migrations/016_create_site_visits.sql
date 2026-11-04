-- Migration 016: Create site_visits table for self-hosted visitor analytics
CREATE TABLE IF NOT EXISTS site_visits (
    id BIGSERIAL PRIMARY KEY,
    visitor_id VARCHAR(64) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    is_logged_in BOOLEAN NOT NULL DEFAULT FALSE,
    page_path VARCHAR(255) NOT NULL,
    page_title VARCHAR(255),
    referrer VARCHAR(500),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    ip_hash VARCHAR(64),
    device_type VARCHAR(32) DEFAULT 'desktop',
    browser VARCHAR(64),
    os VARCHAR(64),
    is_bot BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON site_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_id ON site_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_is_logged_in ON site_visits(is_logged_in);
CREATE INDEX IF NOT EXISTS idx_site_visits_page_path ON site_visits(page_path);
CREATE INDEX IF NOT EXISTS idx_site_visits_user_id ON site_visits(user_id);

