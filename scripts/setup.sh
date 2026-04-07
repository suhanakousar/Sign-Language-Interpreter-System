#!/bin/bash
set -e

echo "========================================="
echo "  Sign Language Interpreter - Setup"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
check_prereq() {
    if command -v "$1" &> /dev/null; then
        info "$1 found: $(command -v "$1")"
        return 0
    else
        error "$1 not found. Please install it first."
        return 1
    fi
}

echo "Checking prerequisites..."
check_prereq node
check_prereq npm
check_prereq python3 || check_prereq python
check_prereq pip3 || check_prereq pip
echo ""

# Copy environment file
if [ ! -f .env ]; then
    cp .env.example .env
    info "Created .env from .env.example"
    warn "Please update .env with your configuration"
else
    info ".env already exists"
fi

# ─── Frontend setup ───
echo ""
info "Setting up frontend..."
cd frontend
npm install
cd ..
info "Frontend dependencies installed"

# ─── Node.js API setup ───
echo ""
info "Setting up Node.js API..."
cd backend/node-api
npm install
cd ../..
info "Node.js API dependencies installed"

# ─── Python services setup ───
echo ""
info "Setting up Python services..."

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    python3 -m venv .venv 2>/dev/null || python -m venv .venv
    info "Created Python virtual environment"
fi

# Activate and install
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate

pip install -r backend/python-services/speech_to_text/requirements.txt
pip install -r backend/python-services/nlp_processor/requirements.txt
pip install -r backend/python-services/text_to_sign/requirements.txt
pip install pytest

info "Python dependencies installed"

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "To start development:"
echo "  1. Update .env with your configuration"
echo "  2. Run: bash scripts/dev.sh"
echo ""
echo "Or start services individually:"
echo "  Frontend:        cd frontend && npm run dev"
echo "  Node API:        cd backend/node-api && npm run dev"
echo "  Speech-to-Text:  cd backend/python-services/speech_to_text && python main.py"
echo "  NLP Processor:   cd backend/python-services/nlp_processor && python main.py"
echo "  Text-to-Sign:    cd backend/python-services/text_to_sign && python main.py"
echo ""
echo "Or use Docker:"
echo "  cd docker && docker-compose up --build"
echo ""
