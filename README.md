# PAMOJA AI — Full Stack App

Alternative credit scoring for Zimbabwean SMEs.
Model AUC: **0.9459** · Trained on 55,305 real African loan outcomes.

---

## Project structure

```
pamoja-app/
├── backend/
│   ├── main.py              ← FastAPI server
│   ├── score_engine.py      ← ML scoring engine
│   ├── requirements.txt
│   └── models/              ← trained .pkl files (copy from pamoja_credit/models/)
│
└── frontend/
    ├── app/
    │   ├── page.tsx         ← Dashboard
    │   ├── lender/          ← Score a borrower
    │   ├── customer/        ← Customer score checker
    │   ├── batch/           ← Batch CSV scoring
    │   └── developer/       ← API docs + live tester
    ├── components/
    │   └── ScoreCard.tsx    ← Reusable score display
    └── package.json
```

---

## Setup (5 minutes)

### Step 1 — Copy your trained models

Copy your model files into `backend/models/`:
```bash
cp -r ../pamoja_credit/models/* backend/models/
cp ../pamoja_credit/score_engine.py backend/score_engine.py
```

### Step 2 — Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API runs at: http://localhost:8000
Auto-docs:  http://localhost:8000/docs

### Step 3 — Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at: http://localhost:3000

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Stats, sample scores, quick links |
| Score Borrower | `/lender` | Form to score any borrower |
| My Score | `/customer` | USSD-style customer score checker |
| Batch Scoring | `/batch` | Upload CSV, score 100 at once |
| API Docs | `/developer` | Endpoints, code examples, live tester |

---

## API endpoints

```
GET  /health          — health check
POST /score           — score from behavioral signals
POST /score/loan      — score a specific loan application
POST /score/batch     — batch score up to 100 borrowers
```

Demo API key: `pk_demo_zw_pamoja2026`

---

## Deploy to production

### One-Click Deploy (Render)
1. Push this repo to GitHub.
2. Log in to [Render](https://render.com).
3. Click **Blueprint** -> **New Blueprint**.
4. Select this repository.
5. Render will automatically provision the **PostgreSQL database**, **FastAPI Backend**, and **Next.js Frontend**.

### Manual Setup
If you prefer manual setup:
1. **Backend**: Create a "Web Service" on Render. Root: `backend`. Build: `pip install -r requirements.txt`. Start: `uvicorn main:app --host 0.0.0.0`.
2. **Database**: Create a "PostgreSQL" instance on Render. Copy the Internal Database URL to the backend's `DATABASE_URL` env var.
3. **Frontend**: Create a "Web Service" on Vercel or Render. Root: `frontend`. Set `NEXT_PUBLIC_API_URL` to your backend URL.

---

## Contact

Desmond Kwaramba · Founder, PAMOJA AI
desmondkwaramba1@gmail.com · Harare, Zimbabwe · Founded 2026
