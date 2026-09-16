-- OmniHost Universal Compute & Hosting Platform Database Schema
-- Compatible with PostgreSQL 14, 15, 16

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    plan_id VARCHAR(64) NOT NULL DEFAULT 'pro',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS hosting_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_projects INT NOT NULL DEFAULT 5,
    max_cpu_cores NUMERIC(4, 1) NOT NULL DEFAULT 2.0,
    max_memory_mb INT NOT NULL DEFAULT 4096,
    max_storage_mb INT NOT NULL DEFAULT 20480,
    max_bandwidth_gb INT NOT NULL DEFAULT 500,
    max_databases INT NOT NULL DEFAULT 3,
    allow_custom_domains BOOLEAN DEFAULT TRUE,
    allow_gpu BOOLEAN DEFAULT FALSE,
    allow_game_servers BOOLEAN DEFAULT TRUE,
    allow_ai_workloads BOOLEAN DEFAULT TRUE,
    max_processes INT NOT NULL DEFAULT 10,
    features JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    owner_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    workload_type VARCHAR(64) NOT NULL DEFAULT 'web',
    runtime VARCHAR(64) NOT NULL DEFAULT 'nodejs-20',
    status VARCHAR(32) NOT NULL DEFAULT 'stopped',
    build_command TEXT,
    start_command TEXT,
    working_dir VARCHAR(255),
    env_vars JSONB DEFAULT '{}'::jsonb,
    limits JSONB NOT NULL,
    ports JSONB DEFAULT '[]'::jsonb,
    domain VARCHAR(255),
    subdomain VARCHAR(255) UNIQUE NOT NULL,
    assigned_internal_port INT NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    git_repo_url TEXT,
    git_branch VARCHAR(128),
    restart_policy VARCHAR(32) DEFAULT 'always',
    restart_count INT DEFAULT 0,
    ai_config JSONB,
    game_server_config JSONB,
    last_deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deployments (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    version INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    commit_message TEXT,
    source_type VARCHAR(32) NOT NULL DEFAULT 'zip',
    logs JSONB DEFAULT '[]'::jsonb,
    duration_ms INT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    deployed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS managed_domains (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    owner_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) UNIQUE NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    ssl_provider VARCHAR(64) DEFAULT 'letsencrypt',
    ssl_expires_at TIMESTAMP WITH TIME ZONE,
    dns_target VARCHAR(255) NOT NULL,
    verification_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS managed_databases (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    owner_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'online',
    database_name VARCHAR(128) NOT NULL,
    username VARCHAR(128) NOT NULL,
    port INT NOT NULL,
    connection_uri TEXT NOT NULL,
    size_mb NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    key_prefix VARCHAR(32) NOT NULL,
    key_hash VARCHAR(128) NOT NULL,
    scopes JSONB DEFAULT '[]'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backups (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    owner_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    size_mb NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    file_path VARCHAR(512) NOT NULL,
    backup_type VARCHAR(32) NOT NULL DEFAULT 'full',
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    user_email VARCHAR(255),
    action VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for high performance
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_subdomain ON projects(subdomain);
CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_domains_project ON managed_domains(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
