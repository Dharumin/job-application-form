-- ============================================================
-- Job Application System — Database Schema (MySQL 8+)
-- ============================================================

CREATE DATABASE IF NOT EXISTS job_application_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE job_application_db;

-- ------------------------------------------------------------
-- Table: positions
-- Job openings that candidates can apply for
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS positions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(150)  NOT NULL,
  department    VARCHAR(100)  NOT NULL,
  location      VARCHAR(150)  NOT NULL,
  employment_type ENUM('Full-time', 'Part-time', 'Contract', 'Internship') NOT NULL DEFAULT 'Full-time',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: applicants
-- One row per person who has ever applied
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applicants (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  first_name      VARCHAR(60)   NOT NULL,
  last_name       VARCHAR(60)   NOT NULL,
  email           VARCHAR(150)  NOT NULL,
  phone           VARCHAR(20)   NOT NULL,
  date_of_birth   DATE          NULL,
  address_line    VARCHAR(200)  NULL,
  city            VARCHAR(100)  NULL,
  state           VARCHAR(100)  NULL,
  postal_code     VARCHAR(20)   NULL,
  country         VARCHAR(100)  NULL,
  linkedin_url    VARCHAR(255)  NULL,
  portfolio_url   VARCHAR(255)  NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_applicant_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: applications
-- One row per application (an applicant may apply more than once)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  applicant_id        INT NOT NULL,
  position_id         INT NOT NULL,
  highest_education    ENUM('High School', 'Diploma', 'Bachelors', 'Masters', 'PhD', 'Other') NOT NULL,
  institution_name    VARCHAR(200)  NULL,
  field_of_study      VARCHAR(150)  NULL,
  graduation_year     YEAR          NULL,
  years_experience    DECIMAL(4,1)  NOT NULL DEFAULT 0,
  current_employer    VARCHAR(150)  NULL,
  current_job_title   VARCHAR(150)  NULL,
  expected_salary     DECIMAL(12,2) NULL,
  notice_period_days  INT           NULL,
  cover_letter        TEXT          NULL,
  resume_path         VARCHAR(255)  NOT NULL,
  status              ENUM('Submitted', 'Under Review', 'Shortlisted', 'Rejected', 'Hired')
                        NOT NULL DEFAULT 'Submitted',
  submitted_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_application_applicant
    FOREIGN KEY (applicant_id) REFERENCES applicants(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_application_position
    FOREIGN KEY (position_id) REFERENCES positions(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Helpful indexes
-- ------------------------------------------------------------
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_position ON applications(position_id);
CREATE INDEX idx_applicants_name ON applicants(last_name, first_name);

-- ------------------------------------------------------------
-- Seed data: a few sample open positions
-- ------------------------------------------------------------
INSERT INTO positions (title, department, location, employment_type) VALUES
  ('Frontend Developer', 'Engineering', 'Remote', 'Full-time'),
  ('Backend Developer',  'Engineering', 'Chennai, IN', 'Full-time'),
  ('UI/UX Designer',     'Design',      'Bengaluru, IN', 'Full-time'),
  ('HR Executive',       'Human Resources', 'Madurai, IN', 'Full-time'),
  ('Marketing Intern',   'Marketing',   'Remote', 'Internship');
