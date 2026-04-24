# Contributing to PAMOJA AI

Welcome to PAMOJA AI! This document provides guidelines for contributing to the project.

## Project Structure

- `backend/`: FastAPI server and ML scoring engine.
  - `models/`: Pre-trained scikit-learn models (.pkl).
  - `tests/`: Unit and functional tests.
- `frontend/`: Next.js web application.
  - `app/`: Next.js 14 App Router pages.
  - `components/`: Shared React components.

## Local Development

### Backend

1. Navigate to the backend directory: `cd pamoja-app/backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment: `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env` file from the provided template.
6. Run the server: `uvicorn main:app --reload`

### Frontend

1. Navigate to the frontend directory: `cd pamoja-app/frontend`
2. Install dependencies: `npm install`
3. Create a `.env.local` file from `.env.example`.
4. Run the development server: `npm run dev`

## Adding New Models

To add a new scoring model:
1. Place the trained `.pkl` file in `backend/models/`.
2. Update `backend/score_engine.py` to load and use the new model.
3. Update `backend/main.py` if new API endpoints are required.

## Testing

Always run tests before submitting changes:
```bash
cd backend
pytest tests/
```

## Security

- Never commit `.env` or `.env.local` files to version control.
- Use environment variables for sensitive information like API keys.
