const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------
// File upload setup (resumes)
// ------------------------------------------------------------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only PDF, DOC, or DOCX resumes are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// ------------------------------------------------------------
// GET /api/positions — list open positions (for the dropdown)
// ------------------------------------------------------------
app.get('/api/positions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, title, department, location, employment_type FROM positions WHERE is_active = TRUE ORDER BY title'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// ------------------------------------------------------------
// POST /api/applications — submit a new job application
// ------------------------------------------------------------
const applicationValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('positionId').notEmpty().withMessage('Please select a position'),
  body('highestEducation').notEmpty().withMessage('Highest education is required'),
  body('yearsExperience').isFloat({ min: 0 }).withMessage('Years of experience must be a positive number')
];

app.post('/api/applications', upload.single('resume'), applicationValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) fs.unlinkSync(req.file.path); // clean up orphaned upload
    return res.status(400).json({ errors: errors.array() });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Resume file is required' });
  }

  const {
    firstName, lastName, email, phone, dateOfBirth,
    addressLine, city, state, postalCode, country,
    linkedinUrl, portfolioUrl,
    positionId, highestEducation, institutionName, fieldOfStudy, graduationYear,
    yearsExperience, currentEmployer, currentJobTitle,
    expectedSalary, noticePeriodDays, coverLetter
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert or reuse applicant by email
    const [existing] = await connection.query(
      'SELECT id FROM applicants WHERE email = ?', [email]
    );

    let applicantId;
    if (existing.length > 0) {
      applicantId = existing[0].id;
      await connection.query(
        `UPDATE applicants SET first_name=?, last_name=?, phone=?, date_of_birth=?,
         address_line=?, city=?, state=?, postal_code=?, country=?,
         linkedin_url=?, portfolio_url=? WHERE id=?`,
        [firstName, lastName, phone, dateOfBirth || null,
         addressLine || null, city || null, state || null, postalCode || null, country || null,
         linkedinUrl || null, portfolioUrl || null, applicantId]
      );
    } else {
      const [result] = await connection.query(
        `INSERT INTO applicants
         (first_name, last_name, email, phone, date_of_birth, address_line, city, state, postal_code, country, linkedin_url, portfolio_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [firstName, lastName, email, phone, dateOfBirth || null,
         addressLine || null, city || null, state || null, postalCode || null, country || null,
         linkedinUrl || null, portfolioUrl || null]
      );
      applicantId = result.insertId;
    }

    const resumePath = `/uploads/${req.file.filename}`;

    const [appResult] = await connection.query(
      `INSERT INTO applications
       (applicant_id, position_id, highest_education, institution_name, field_of_study, graduation_year,
        years_experience, current_employer, current_job_title, expected_salary, notice_period_days,
        cover_letter, resume_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [applicantId, positionId, highestEducation, institutionName || null, fieldOfStudy || null,
       graduationYear || null, yearsExperience, currentEmployer || null, currentJobTitle || null,
       expectedSalary || null, noticePeriodDays || null, coverLetter || null, resumePath]
    );

    await connection.commit();
    res.status(201).json({
      message: 'Application submitted successfully',
      applicationId: appResult.insertId
    });
  } catch (err) {
    await connection.rollback();
    if (req.file) fs.unlinkSync(req.file.path);
    console.error(err);
    res.status(500).json({ error: 'Failed to submit application' });
  } finally {
    connection.release();
  }
});

// ------------------------------------------------------------
// GET /api/applications — list all applications (admin view)
// ------------------------------------------------------------
app.get('/api/applications', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.id, ap.first_name, ap.last_name, ap.email, ap.phone,
             p.title AS position, a.status, a.submitted_at
      FROM applications a
      JOIN applicants ap ON ap.id = a.applicant_id
      JOIN positions p ON p.id = a.position_id
      ORDER BY a.submitted_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Serve uploaded resumes statically (admin/reviewer access)
app.use('/uploads', express.static(uploadDir));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
