-- Create project_settings table
CREATE TABLE IF NOT EXISTS project_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    auto_generate_docs BOOLEAN NOT NULL DEFAULT FALSE,
    github_access_token TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for project_id lookup
CREATE INDEX IF NOT EXISTS idx_project_settings_project_id ON project_settings(project_id);

-- Migrate existing projects to have settings
INSERT INTO project_settings (project_id, auto_generate_docs, github_access_token)
SELECT id, FALSE, NULL FROM projects
WHERE id NOT IN (SELECT project_id FROM project_settings)
ON CONFLICT (project_id) DO NOTHING;
