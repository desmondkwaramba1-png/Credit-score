-- =============================================================================
-- Credit Scoring Platform — PostgreSQL Schema
-- Database: credit_scoring
-- =============================================================================

-- Drop tables in reverse dependency order (safe re-run)
DROP TABLE IF EXISTS audit_logs       CASCADE;
DROP TABLE IF EXISTS credit_scores    CASCADE;
DROP TABLE IF EXISTS transactions     CASCADE;
DROP TABLE IF EXISTS borrowers        CASCADE;
DROP TABLE IF EXISTS users            CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS user_type_enum    CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS risk_level_enum   CASCADE;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_type_enum AS ENUM ('SME', 'lender');
CREATE TYPE transaction_type_enum AS ENUM ('sale', 'payment', 'invoice', 'mobile_money');
CREATE TYPE risk_level_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- =============================================================================
-- TABLE: users
-- Stores SME owners and lenders who access the platform.
-- =============================================================================

CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)        NOT NULL,
    email           VARCHAR(255)        NOT NULL UNIQUE,
    password_hash   VARCHAR(512)        NOT NULL,
    user_type       user_type_enum      NOT NULL DEFAULT 'SME',
    api_key         VARCHAR(128)        UNIQUE,
    is_active       BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_api_key  ON users(api_key);
CREATE INDEX idx_users_type     ON users(user_type);

-- =============================================================================
-- TABLE: borrowers
-- SME business profiles linked to a user account.
-- =============================================================================

CREATE TABLE borrowers (
    borrower_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID            NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    business_name           VARCHAR(255)    NOT NULL,
    registration_date       DATE,
    business_age_months     INTEGER         DEFAULT 0,
    -- Kaggle Credit-Risk dataset features (used by the ML model)
    person_age              INTEGER,
    person_income           NUMERIC(15, 2),
    person_home_ownership   VARCHAR(20),
    person_emp_length       NUMERIC(5, 1),
    loan_intent             VARCHAR(50),
    loan_grade              VARCHAR(5),
    loan_amnt               NUMERIC(15, 2),
    loan_int_rate           NUMERIC(6, 2),
    loan_percent_income     NUMERIC(6, 4),
    cb_person_default_on_file VARCHAR(1),
    cb_person_cred_hist_length INTEGER,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_borrowers_user_id ON borrowers(user_id);

-- =============================================================================
-- TABLE: transactions
-- Raw SME financial transaction history for profiling and analysis.
-- =============================================================================

CREATE TABLE transactions (
    transaction_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id         UUID                    NOT NULL REFERENCES borrowers(borrower_id) ON DELETE CASCADE,
    amount              NUMERIC(15, 2)           NOT NULL,
    type                transaction_type_enum    NOT NULL,
    description         TEXT,
    transaction_date    TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_borrower_id   ON transactions(borrower_id);
CREATE INDEX idx_transactions_date          ON transactions(transaction_date);
CREATE INDEX idx_transactions_type          ON transactions(type);

-- =============================================================================
-- TABLE: credit_scores
-- Stores every ML prediction for each borrower.
-- =============================================================================

CREATE TABLE credit_scores (
    score_id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id             UUID            NOT NULL REFERENCES borrowers(borrower_id) ON DELETE CASCADE,
    credit_score            INTEGER         NOT NULL CHECK (credit_score BETWEEN 300 AND 850),
    default_probability     NUMERIC(6, 4)   NOT NULL CHECK (default_probability BETWEEN 0 AND 1),
    risk_level              risk_level_enum NOT NULL,
    shap_explanations       JSONB,          -- top-5 SHAP feature importances
    recommendations         JSONB,          -- actionable recommendations for the SME
    model_version           VARCHAR(50)     DEFAULT '1.0.0',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_scores_borrower_id  ON credit_scores(borrower_id);
CREATE INDEX idx_credit_scores_risk_level   ON credit_scores(risk_level);
CREATE INDEX idx_credit_scores_created_at   ON credit_scores(created_at);

-- =============================================================================
-- TABLE: audit_logs
-- Immutable record of every API request and its response.
-- =============================================================================

CREATE TABLE audit_logs (
    log_id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            REFERENCES users(user_id) ON DELETE SET NULL,
    endpoint            VARCHAR(255)    NOT NULL,
    method              VARCHAR(10)     NOT NULL DEFAULT 'POST',
    request_payload     JSONB,
    response_payload    JSONB,
    status_code         INTEGER,
    duration_ms         INTEGER,        -- response time in milliseconds
    ip_address          INET,
    timestamp           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id     ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_endpoint    ON audit_logs(endpoint);
CREATE INDEX idx_audit_logs_timestamp   ON audit_logs(timestamp);


-- =============================================================================
-- SAMPLE DATA & DML QUERIES
-- =============================================================================

-- ── INSERT: Create sample users ───────────────────────────────────────────────

INSERT INTO users (name, email, password_hash, user_type, api_key) VALUES
    ('Kwame Mensah',   'kwame@sme-ghana.com', 'hashed_pw_1', 'SME',    'sk-sme-kwame-0001'),
    ('Ama Owusu',      'ama@fintechgh.com',   'hashed_pw_2', 'lender', 'sk-lender-ama-0001'),
    ('Kofi Boateng',   'kofi@smallbiz.com',   'hashed_pw_3', 'SME',    'sk-sme-kofi-0002');

-- ── INSERT: Create borrower profiles ──────────────────────────────────────────

INSERT INTO borrowers (
    user_id, business_name, registration_date, business_age_months,
    person_age, person_income, person_home_ownership, person_emp_length,
    loan_intent, loan_grade, loan_amnt, loan_int_rate, loan_percent_income,
    cb_person_default_on_file, cb_person_cred_hist_length
)
SELECT
    u.user_id,
    'Mensah Trading Co.',
    '2021-06-01',
    33,
    28, 55000.00, 'RENT', 3.0, 'EDUCATION', 'B', 12000.00, 11.5, 0.22, 'N', 5
FROM users u WHERE u.email = 'kwame@sme-ghana.com';

-- ── INSERT: Create sample transactions ────────────────────────────────────────

INSERT INTO transactions (borrower_id, amount, type, description, transaction_date)
SELECT
    b.borrower_id,
    1500.00,
    'sale',
    'Monthly product sales',
    NOW() - INTERVAL '5 days'
FROM borrowers b WHERE b.business_name = 'Mensah Trading Co.';

-- ── INSERT: Create a credit score prediction ──────────────────────────────────

INSERT INTO credit_scores (
    borrower_id, credit_score, default_probability, risk_level,
    shap_explanations, recommendations
)
SELECT
    b.borrower_id,
    720,
    0.18,
    'LOW',
    '{"loan_to_income_ratio": 0.35, "loan_int_rate": 0.25, "person_income": -0.18, "loan_amnt": 0.12, "person_emp_length": -0.09}'::jsonb,
    '["Maintain current repayment schedule", "Consider reducing loan-to-income ratio", "Build 12+ months credit history"]'::jsonb
FROM borrowers b WHERE b.business_name = 'Mensah Trading Co.';


-- =============================================================================
-- SAMPLE SELECT QUERIES
-- =============================================================================

-- Get all SME users with their latest credit score
SELECT
    u.name,
    u.email,
    b.business_name,
    cs.credit_score,
    cs.risk_level,
    cs.default_probability,
    cs.created_at AS last_scored
FROM users u
JOIN borrowers b         ON u.user_id = b.user_id
LEFT JOIN LATERAL (
    SELECT * FROM credit_scores
    WHERE borrower_id = b.borrower_id
    ORDER BY created_at DESC LIMIT 1
) cs ON TRUE
WHERE u.user_type = 'SME'
ORDER BY cs.credit_score DESC;

-- Get credit score history for a specific borrower
SELECT
    score_id,
    credit_score,
    default_probability,
    risk_level,
    recommendations,
    created_at
FROM credit_scores
WHERE borrower_id = '00000000-0000-0000-0000-000000000000'  -- replace with real UUID
ORDER BY created_at ASC;

-- Get transaction summary per borrower
SELECT
    b.business_name,
    t.type,
    COUNT(*)            AS num_transactions,
    SUM(t.amount)       AS total_amount,
    AVG(t.amount)       AS avg_amount,
    MAX(t.transaction_date) AS last_transaction
FROM borrowers b
JOIN transactions t ON b.borrower_id = t.borrower_id
GROUP BY b.business_name, t.type
ORDER BY b.business_name, t.type;

-- Audit log: API usage summary per endpoint
SELECT
    endpoint,
    COUNT(*)        AS total_calls,
    AVG(duration_ms) AS avg_duration_ms,
    SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) AS successes,
    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS errors
FROM audit_logs
GROUP BY endpoint
ORDER BY total_calls DESC;


-- =============================================================================
-- SAMPLE UPDATE QUERIES
-- =============================================================================

-- Update borrower income after re-assessment
UPDATE borrowers
SET person_income = 65000.00, updated_at = NOW()
WHERE business_name = 'Mensah Trading Co.';

-- Deactivate a user account
UPDATE users
SET is_active = FALSE, updated_at = NOW()
WHERE email = 'kofi@smallbiz.com';

-- Rotate API key for a lender
UPDATE users
SET api_key = 'sk-lender-ama-rotated-9999', updated_at = NOW()
WHERE email = 'ama@fintechgh.com';
