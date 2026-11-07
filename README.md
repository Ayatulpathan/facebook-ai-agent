# Local-Only AI Facebook Page Management Agent

An enterprise-grade, privacy-first, 100% zero-cost Facebook Page Management System tailored for local Windows execution.

## Key Principles & Guarantees
- **Zero Cloud Costs**: Absolutely zero paid APIs (no OpenAI, no paid Gemini, no paid video/image APIs, no paid DBs).
- **Local AI Engine**: Powered by local Ollama (`qwen2.5:1.5b` or `qwen2.5:0.5b`).
- **Human-in-the-Loop Mandate**: Every single post, Reel, comment reply, and Messenger message strictly requires administrator approval before publishing.
- **Hardware-Optimized**: Designed for Windows 10/11 with 8 GB RAM and 4 GB VRAM GPU.

## System Architecture
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Python 3.11+ / 3.14+, FastAPI, SQLAlchemy, Pydantic v2
- **Database**: SQLite with Write-Ahead Logging (WAL)
- **AI**: Ollama (`qwen2.5:1.5b`)
- **Media**: FFmpeg & HTML/SVG local canvas rendering

## Getting Started

### Backend Setup
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.main
```
Backend runs at `http://127.0.0.1:8000` (API Docs: `http://127.0.0.1:8000/docs`).

### Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

Default local admin credentials:
- Username: `admin`
- Password: `adminpassword123` (prompted to change upon initial setup)
