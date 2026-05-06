-- Migration: Multi-portal support and Settings expansion

-- 1. Add portal_id to existing tables
ALTER TABLE presets ADD COLUMN IF NOT EXISTS portal_id UUID DEFAULT 'default-portal';
ALTER TABLE generation_jobs ADD COLUMN IF NOT EXISTS portal_id UUID DEFAULT 'default-portal';
ALTER TABLE bx_entity_mapping ADD COLUMN IF NOT EXISTS portal_id UUID DEFAULT 'default-portal';

-- Create index for multi-portal queries
CREATE INDEX IF NOT EXISTS idx_presets_portal ON presets(portal_id);
CREATE INDEX IF NOT EXISTS idx_jobs_portal ON generation_jobs(portal_id);
CREATE INDEX IF NOT EXISTS idx_bx_mapping_portal ON bx_entity_mapping(portal_id);

-- 2. Update app_settings to store complex configs per portal
-- Key format: 'portal_id:key_name' or just 'global:key_name'
-- Value is JSONB to store secrets, flags, and mappings
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS portal_id UUID DEFAULT 'default-portal';
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_unique ON app_settings(portal_id, key);

-- 3. Create portals table (optional, for managing multiple installations)
CREATE TABLE IF NOT EXISTS portals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bitrix_domain TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Seed default portal
INSERT INTO portals (id, name, bitrix_domain) 
VALUES ('default-portal', 'Default Portal', NULL)
ON CONFLICT (id) DO NOTHING;
