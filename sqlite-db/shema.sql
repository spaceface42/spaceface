PRAGMA foreign_keys = ON;

-- =========================
-- Projects
-- =========================
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    year INTEGER,
    client TEXT,
    published_at TEXT, -- NULL = draft, ISO date = published
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
);

-- =========================
-- Project files
-- =========================
CREATE TABLE project_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL, -- image, video, pdf
    role TEXT NOT NULL DEFAULT 'gallery'
        CHECK (role IN ('cover','gallery','detail','inline')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    caption TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE
);

-- =========================
-- Helpful indexes
-- =========================
CREATE INDEX idx_projects_published
    ON projects(published_at);

CREATE INDEX idx_project_files_project
    ON project_files(project_id);

CREATE INDEX idx_project_files_order
    ON project_files(project_id, sort_order);
