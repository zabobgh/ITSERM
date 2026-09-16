-- SQLite Schema for NBK. 1-56 & OCC Screening System
-- Enable Write-Ahead Logging for high concurrency and robustness
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS farmers (
    citizen_id TEXT PRIMARY KEY,
    fullname TEXT NOT NULL,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
    address TEXT,
    occupation TEXT,
    plant_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    citizen_id TEXT NOT NULL,
    eval_date TEXT NOT NULL,
    interviewer_name TEXT NOT NULL,
    health_center TEXT NOT NULL,
    score_a INTEGER NOT NULL,
    score_b INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    highest_symptom_group INTEGER NOT NULL,
    symptoms TEXT, -- JSON Array of symptoms
    risk_level TEXT NOT NULL,
    require_blood_test INTEGER NOT NULL DEFAULT 0,
    cholinesterase_result TEXT, -- ปกติ, ปลอดภัย, มีความเสี่ยง, ไม่ปลอดภัย
    chemical_names TEXT, -- JSON Array of chemicals
    answers_a TEXT, -- JSON map of question answers (q9-q17)
    answers_b TEXT, -- JSON map of question answers (q18-q23)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (citizen_id) REFERENCES farmers(citizen_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assessments_citizen_id ON assessments(citizen_id);
CREATE INDEX IF NOT EXISTS idx_assessments_risk_level ON assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_assessments_eval_date ON assessments(eval_date);
