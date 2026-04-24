#!/bin/bash
# PAMOJA AI — One-command setup
# Run this from the pamoja-app/ folder: bash setup.sh

set -e

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   PAMOJA AI — Setup                   ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
  echo "❌ Python 3 not found. Install from python.org"
  exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from nodejs.org"
  exit 1
fi

echo "✓ Python $(python3 --version)"
echo "✓ Node $(node --version)"
echo ""

# Backend setup
echo "─── Installing backend dependencies..."
cd backend
pip install -r requirements.txt
if [ ! -f .env ]; then
  cat > .env <<EOF
# PAMOJA AI Backend Environment Variables
API_PORT=8000
API_HOST=0.0.0.0
DEMO_API_KEY=pk_demo_zw_pamoja2026
LIVE_API_KEY=pk_live_zw_lender001
MODEL_DIR=./models
EOF
  echo "✓ Created backend .env"
fi
echo "✓ Backend ready"
echo ""

# Frontend setup
echo "─── Installing frontend dependencies..."
cd ../frontend
npm install
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "✓ Created frontend .env.local"
fi
echo "✓ Frontend ready"
echo ""

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   Setup complete! To run:             ║"
echo "║                                       ║"
echo "║   Terminal 1 (backend):               ║"
echo "║   cd backend                          ║"
echo "║   uvicorn main:app --reload           ║"
echo "║                                       ║"
echo "║   Terminal 2 (frontend):              ║"
echo "║   cd frontend                         ║"
echo "║   npm run dev                         ║"
echo "║                                       ║"
echo "║   Terminal 3 (tests):                 ║"
echo "║   cd backend                          ║"
echo "║   python -m pytest tests/             ║"
echo "║                                       ║"
echo "║   Open: http://localhost:3000         ║"
echo "╚═══════════════════════════════════════╝"
echo ""
