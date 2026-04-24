🤖 PAMOJA AI — Alternative Credit Scoring for Zimbabwean SMEs








Full-stack AI platform predicting creditworthiness for Zimbabwean SMEs.

Model AUC: 0.9459
Trained on 55,305 real African loan outcomes
Focused on financial inclusion and fair credit scoring
📌 Problem

Many SMEs in Zimbabwe lack access to credit because traditional banks rely on limited financial history. This leaves deserving businesses without funding.

💡 Solution

PAMOJA AI predicts creditworthiness using alternative behavioral and financial data, giving lenders reliable and inclusive scoring.

Key Features:

Individual borrower scoring
Batch scoring for multiple applicants
Customer-facing score checker
API integration for fintechs
🛠 Tech Stack
Backend: Python, FastAPI
Frontend: Next.js, React, TypeScript
Database: MongoDB / SQLite
ML: Scikit-learn, Pandas
Deployment: Render / Vercel
🗂 Project Structure
pamoja-app/
├── backend/
│   ├── main.py           ← FastAPI server
│   ├── score_engine.py   ← ML scoring engine
│   ├── requirements.txt
│   └── models/           ← trained .pkl files
└── frontend/
    ├── app/
    │   ├── page.tsx      ← Dashboard
    │   ├── lender/       ← Score a borrower
    │   ├── customer/     ← Customer score checker
    │   ├── batch/        ← Batch CSV scoring
    │   └── developer/    ← API docs + live tester
    ├── components/
    │   └── ScoreCard.tsx ← Reusable score display
    └── package.json
⚡ Setup (5 minutes)
Step 1 — Copy trained models
cp -r ../pamoja_credit/models/* backend/models/
cp ../pamoja_credit/score_engine.py backend/score_engine.py
Step 2 — Start Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
API: http://localhost:8000
Auto-docs: http://localhost:8000/docs
Step 3 — Start Frontend
cd frontend
npm install
npm run dev
App: http://localhost:3000
📄 Pages Overview
Page	URL	Description
Dashboard	/	Stats, sample scores, quick links
Score Borrower	/lender	Form to score any borrower
My Score	/customer	USSD-style customer score checker
Batch Scoring	/batch	Upload CSV, score 100 borrowers at once
API Docs	/developer	Endpoints, code examples, live tester
📝 API Endpoints
Method	Endpoint	Description
GET	/health	Health check
POST	/score	Score from behavioral signals
POST	/score/loan	Score a specific loan
POST	/score/batch	Batch score up to 100 borrowers

Demo API key: pk_demo_zw_pamoja2026
