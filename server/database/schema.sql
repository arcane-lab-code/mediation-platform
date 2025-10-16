-- Mediation Platform Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'client', -- admin, mediator, client
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cases Table
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    case_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, active, suspended, resolved, closed
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    category VARCHAR(100), -- family, commercial, labor, civil, etc.
    created_by INTEGER REFERENCES users(id),
    assigned_mediator INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolution_date TIMESTAMP,
    resolution_summary TEXT
);

-- Case Parties Table (demandante, demandado)
CREATE TABLE IF NOT EXISTS case_parties (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    party_type VARCHAR(50) NOT NULL, -- claimant (demandante), respondent (demandado)
    organization VARCHAR(255),
    representative VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table (mediation sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    location VARCHAR(255), -- online, physical address
    meeting_link VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Session Participants Table
CREATE TABLE IF NOT EXISTS session_participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    attendance_status VARCHAR(50) DEFAULT 'invited', -- invited, confirmed, attended, absent
    joined_at TIMESTAMP,
    left_at TIMESTAMP
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id),
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100), -- evidence, agreement, complaint, correspondence
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    is_confidential BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table (communication between parties)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id),
    recipient_id INTEGER REFERENCES users(id),
    subject VARCHAR(255),
    message_body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Case Timeline/Activity Log
CREATE TABLE IF NOT EXISTS case_activities (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    activity_type VARCHAR(100) NOT NULL, -- case_created, status_changed, document_uploaded, session_scheduled, etc.
    description TEXT NOT NULL,
    metadata JSONB, -- additional data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agreements Table (mediation agreements)
CREATE TABLE IF NOT EXISTS agreements (
    id SERIAL PRIMARY KEY,
    case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
    agreement_text TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending_signatures, signed, rejected
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP
);

-- Agreement Signatures Table
CREATE TABLE IF NOT EXISTS agreement_signatures (
    id SERIAL PRIMARY KEY,
    agreement_id INTEGER REFERENCES agreements(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    signature_data TEXT, -- could store digital signature
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50), -- info, warning, success, error
    is_read BOOLEAN DEFAULT false,
    link VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_mediator ON cases(assigned_mediator);
CREATE INDEX idx_case_parties_case ON case_parties(case_id);
CREATE INDEX idx_sessions_case ON sessions(case_id);
CREATE INDEX idx_documents_case ON documents(case_id);
CREATE INDEX idx_messages_case ON messages(case_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_activities_case ON case_activities(case_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: Admin123!)
INSERT INTO users (email, password, first_name, last_name, role)
VALUES (
    'admin@mediation.com',
    '$2a$10$XQXVvHBqXKOGDVqvqB3LWOlQYm3J7.6LCq4w4HFqRFOqQ5u5.5u5C',
    'Admin',
    'System',
    'admin'
) ON CONFLICT (email) DO NOTHING;
