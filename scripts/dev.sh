#!/bin/bash
set -e

echo "Starting all services in development mode..."
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down all services..."
    kill $(jobs -p) 2>/dev/null
    wait
    echo "All services stopped."
}
trap cleanup EXIT INT TERM

# Activate Python venv
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate 2>/dev/null

# Start Python services
echo "[1/5] Starting Speech-to-Text service (port 8001)..."
cd backend/python-services/speech_to_text
python main.py &
cd ../../..

echo "[2/5] Starting NLP Processor service (port 8002)..."
cd backend/python-services/nlp_processor
python main.py &
cd ../../..

echo "[3/5] Starting Text-to-Sign service (port 8003)..."
cd backend/python-services/text_to_sign
python main.py &
cd ../../..

# Wait for Python services to start
sleep 3

# Start Node.js API
echo "[4/5] Starting Node.js API (port 3001)..."
cd backend/node-api
npm run dev &
cd ../..

# Wait for API to start
sleep 2

# Start frontend
echo "[5/5] Starting frontend (port 3000)..."
cd frontend
npm run dev &
cd ..

echo ""
echo "========================================="
echo "  All services running!"
echo "========================================="
echo ""
echo "  Frontend:        http://localhost:3000"
echo "  Node API:        http://localhost:3001"
echo "  WebSocket:       ws://localhost:3001/live-translation"
echo "  Speech-to-Text:  http://localhost:8001/health"
echo "  NLP Processor:   http://localhost:8002/health"
echo "  Text-to-Sign:    http://localhost:8003/health"
echo ""
echo "Press Ctrl+C to stop all services."
echo ""

# Wait for all background processes
wait
