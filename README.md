# Job Application Form

A three-tier job application system: static frontend, Node/Express API, MySQL database.

```
job-application/
├── frontend/
│   ├── index.html      # the form
│   ├── style.css        # styling
│   └── script.js         # validation, positions dropdown, submit logic
├── backend/
│   ├── server.js         # Express API (routes below)
│   ├── db.js              # MySQL connection pool
│   ├── package.json
│   ├── .env.example
│   └── uploads/            # resumes land here at runtime
└── database/
    └── schema.sql         # tables + sample positions
```

## 1. Database setup

Make sure MySQL is running, then:

```bash
mysql -u root -p < database/schema.sql
```

This creates `job_application_db` with `positions`, `applicants`, and `applications` tables, plus five sample job openings.

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env    # then edit .env with your MySQL password
npm start                # or: npm run dev (with nodemon)
```

The API runs on `http://localhost:5000` by default.

**Routes:**
| Method | Route                | Purpose                              |
|--------|-----------------------|---------------------------------------|
| GET    | `/api/positions`     | List open positions (for the dropdown) |
| POST   | `/api/applications`  | Submit a new application (multipart, includes resume file) |
| GET    | `/api/applications`  | List all submitted applications (admin view) |

## 3. Frontend setup

The frontend is plain HTML/CSS/JS — no build step. Just open `frontend/index.html` in a browser, or serve it:

```bash
cd frontend
npx serve .
```

It calls the API at `http://localhost:5000/api` (edit `API_BASE` in `script.js` if your backend runs elsewhere).

## Notes

- Resumes accept PDF, DOC, DOCX up to 5MB and are stored in `backend/uploads/`.
- Applying with the same email twice updates the existing applicant record and adds a new row in `applications` — so someone can apply to more than one role.
- For production: put the API behind HTTPS, restrict CORS to your real frontend origin, and move file storage to S3 or similar rather than local disk.
