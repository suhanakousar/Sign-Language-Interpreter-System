# Sign Language Interpreter System

Real-time AI-powered sign language interpreter that converts speech to 3D avatar sign language animations.

## Architecture

```
Audio Input → Whisper STT → NLP Processing → Gesture Mapping → 3D Avatar Animation
     ↑              ↓              ↓               ↓                    ↓
 Microphone    Python/8001    Python/8002     Python/8003         Three.js/React
                   ↑              ↑               ↑
                   └──── Node.js API Gateway (3001) ────┘
                              ↑
                     WebSocket (real-time)
                              ↑
                      Next.js Frontend (3000)
```

### Services

| Service | Technology | Port | Description |
|---------|-----------|------|-------------|
| Frontend | Next.js + Three.js | 3000 | UI with 3D avatar |
| API Gateway | Node.js + Express | 3001 | WebSocket + REST routing |
| Speech-to-Text | FastAPI + Whisper | 8001 | Audio transcription |
| NLP Processor | FastAPI + spaCy | 8002 | Sign language grammar conversion |
| Text-to-Sign | FastAPI | 8003 | Gesture sequence generation |

## Folder Structure

```
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                # Pages (App Router)
│   │   ├── components/         # React components
│   │   │   ├── Avatar3D.tsx    # 3D avatar with Three.js
│   │   │   ├── MicrophoneButton.tsx
│   │   │   ├── TranscriptPanel.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   └── GestureQueue.tsx
│   │   ├── hooks/              # Custom hooks
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useAudioCapture.ts
│   │   │   └── useGesturePlayer.ts
│   │   ├── lib/                # Utilities
│   │   └── types/              # TypeScript types
│   └── public/models/          # 3D avatar models (.glb)
├── backend/
│   ├── node-api/               # Express + WebSocket gateway
│   │   └── src/
│   │       ├── server.ts
│   │       ├── routes/api.ts
│   │       ├── services/
│   │       │   ├── pipeline.ts     # Orchestrates AI services
│   │       │   └── websocket.ts    # WebSocket session management
│   │       ├── middleware/
│   │       │   ├── auth.ts         # JWT authentication
│   │       │   └── validation.ts   # Input validation
│   │       └── config/
│   └── python-services/
│       ├── speech_to_text/     # Whisper-based transcription
│       ├── nlp_processor/      # English → sign language grammar
│       ├── text_to_sign/       # Token → gesture sequence mapping
│       └── shared/             # Shared Pydantic models
├── docker/                     # Dockerfiles + compose
├── nginx/                      # Reverse proxy config
├── scripts/                    # Setup, dev, deploy, test scripts
└── data/gestures/              # Gesture dictionary reference
```

## Quick Start

### Prerequisites

- Node.js >= 18
- Python >= 3.10
- FFmpeg (for audio processing)
- Docker + Docker Compose (for containerized deployment)

### Option 1: Local Development

```bash
# 1. Clone and setup
git clone <repo-url>
cd Sign-Language-Interpreter-System
bash scripts/setup.sh

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Start all services
bash scripts/dev.sh
```

Open http://localhost:3000 in your browser.

### Option 2: Docker Deployment

```bash
# 1. Configure
cp .env.example .env

# 2. Build and run
cd docker
docker-compose up --build

# Or use the deploy script
bash scripts/deploy.sh
```

Application available at http://localhost (via nginx).

### Option 3: Start Services Individually

```bash
# Terminal 1: Speech-to-Text
cd backend/python-services/speech_to_text
pip install -r requirements.txt
python main.py  # port 8001

# Terminal 2: NLP Processor
cd backend/python-services/nlp_processor
pip install -r requirements.txt
python main.py  # port 8002

# Terminal 3: Text-to-Sign
cd backend/python-services/text_to_sign
pip install -r requirements.txt
python main.py  # port 8003

# Terminal 4: Node.js API
cd backend/node-api
npm install && npm run dev  # port 3001

# Terminal 5: Frontend
cd frontend
npm install && npm run dev  # port 3000
```

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/token` | Generate JWT token |
| POST | `/api/audio-stream` | Process audio file |
| GET | `/api/gesture-sequence?text=...` | Get gestures from text |
| POST | `/api/process-text` | Process text to gestures |

### WebSocket

Connect to `ws://localhost:3001/live-translation`

**Send**: Binary audio chunks (1-2s intervals)

**Receive**:
```json
{
  "type": "transcript_final",
  "payload": {
    "text": "I am going to school",
    "processed_text": "I GO SCHOOL",
    "confidence": 0.95
  },
  "timestamp": 1712345678000
}
```

```json
{
  "type": "gesture_sequence",
  "payload": {
    "sequence": [
      { "word": "i", "animation": "i.glb", "duration": 0.5, "transition": 0.3 },
      { "word": "go", "animation": "go.glb", "duration": 0.8, "transition": 0.3 },
      { "word": "school", "animation": "school.glb", "duration": 0.8, "transition": 0.3 }
    ],
    "source_text": "I GO SCHOOL"
  }
}
```

## NLP Pipeline

The NLP processor converts English grammar to sign language structure:

| English Input | Sign Language Output | Transformations |
|---|---|---|
| "I am going to school" | "I GO SCHOOL" | Remove articles/prepositions, base verb form |
| "She doesn't like the food" | "SHE NOT LIKE FOOD" | Expand contraction, remove articles |
| "What is your name?" | "YOUR NAME WHAT" | Question word moves to end (ASL) |
| "I have been working" | "I WORK" | Simplify tense |

## Gesture System

Hybrid approach:
1. **Dictionary lookup**: 130+ common words mapped to animation files
2. **Fingerspelling fallback**: Unknown words spelled letter-by-letter

Gesture dictionary format:
```json
{
  "word": "hello",
  "animation_file": "hello.glb",
  "duration": 1.2,
  "category": "greeting",
  "tags": ["common", "greeting"]
}
```

## Testing

```bash
# Run all tests
bash scripts/test.sh

# Run specific test suites
cd backend/python-services/nlp_processor && python -m pytest test_nlp.py -v
cd backend/python-services/text_to_sign && python -m pytest test_text_to_sign.py -v
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Node.js API port |
| `WHISPER_MODEL` | base | Whisper model size (tiny/base/small/medium/large) |
| `WHISPER_DEVICE` | cpu | Device for Whisper (cpu/cuda) |
| `MONGODB_URI` | mongodb://localhost:27017/... | MongoDB connection |
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `JWT_SECRET` | (dev default) | JWT signing secret |

## Adding Custom Gestures

1. Create animation in Blender, export as `.glb`
2. Place file in `frontend/public/models/`
3. Add entry to `backend/python-services/text_to_sign/gesture_dictionary.json`:

```json
{ "word": "custom", "animation_file": "custom.glb", "duration": 1.0, "category": "common" }
```

4. Restart the text-to-sign service

## Performance Notes

- Audio is chunked at 1-second intervals for low latency
- Common gestures are cached in Redis
- WebSocket keeps persistent connection (no HTTP overhead per chunk)
- Whisper `base` model is recommended for real-time use; use `tiny` for lower latency
- GPU (CUDA) significantly improves Whisper performance: set `WHISPER_DEVICE=cuda`

## License

MIT
