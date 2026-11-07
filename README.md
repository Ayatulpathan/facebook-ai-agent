# Privacy-First, Local-Only AI Facebook Page Management System

[![Zero-Cost Software Guarantee](https://img.shields.io/badge/Cost-100%25%20Zero--Cost-brightgreen.svg)](#zero-cost-requirement)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Local AI Engine](https://img.shields.io/badge/AI%20Engine-Ollama%20(qwen2.5%3A1.5b)-purple.svg)](#local-ai-engine)
[![Tests Passing](https://img.shields.io/badge/Tests-40%2F40%20Passing-success.svg)](#testing-and-verification)
[![Strict Host Binding](https://img.shields.io/badge/Binding-127.0.0.1%20Localhost%20Only-orange.svg)](#security-and-privacy)

An enterprise-grade, privacy-first, fully local AI Facebook Page Management System engineered specifically to run entirely on a personal Windows computer.

---

## 1. Zero-Cost Requirement & Hardware Optimization

This system was designed from the ground up under a **strict Zero-Cost mandate**. It requires absolutely zero paid third-party APIs, zero cloud subscriptions, and zero paywalled databases.

### Target Hardware Specifications
- **Operating System**: Windows 10 / 11 64-bit
- **RAM**: 8 GB
- **GPU**: NVIDIA, 4 GB VRAM (No dedicated GPU required for core functionality; CPU execution fully supported)
- **CPU**: Intel Core i5 / AMD Ryzen 5
- **Browser**: Google Chrome / Microsoft Edge
- **Network**: Localhost binding only (`http://127.0.0.1:8000` and `http://localhost:5173`)

### Strict Prohibitions Enforced
- **NO** OpenAI API or paid Anthropic Claude API
- **NO** Paid Gemini API tokens or billing dependencies
- **NO** Paid Cloud Image Generation APIs (Midjourney, DALL-E, Stability AI)
- **NO** Paid Cloud Video Generation APIs (Runway, Pika, Sora)
- **NO** Paid Cloud Databases or BaaS (Firebase paid Blaze plans, Supabase Pro, AWS RDS)
- **NO** Paid Automation or Scheduling Services (Zapier, Make, Buffer, Hootsuite)

*If an operation cannot be completed without a paid service, the application displays:*
> **"This feature is unavailable in the current zero-cost configuration."**

---

## 2. Critical Invariant: Human-in-the-Loop Gatekeeper

> **CRITICAL ARCHITECTURAL RULE**: Every single post, Reel, outgoing comment reply, and outgoing customer Messenger message **MUST require explicit authenticated human administrator approval** before publishing or sending.

1. **AI Agents Cannot Approve Their Own Content**: All drafts (posts, graphics, reels, replies) are created strictly in `Draft` or `Pending Approval` status.
2. **Version-Specific Approval Records**: Content edits automatically increment the version number and invalidate prior approvals (`status = INVALIDATED`), dropping content back into pending review.
3. **Double Verification at Transmission Time**: The backend `PublisherGatekeeper` verifies that an approval record exists, has status `APPROVED`, is attached to a human `reviewer_id`, and matches the exact content version before contacting the Meta Graph API.
4. **Emergency Global Pause Kill-Switch**: A single-click toggle instantly blocks all automated background publishing and message dispatch across the entire system.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler & Dev Server**: Vite 5
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v6
- **Data Fetching & Caching**: TanStack Query (React Query) v5
- **Icons**: Lucide React

### Backend
- **Framework**: Python 3.11+ / Python 3.14+ with FastAPI
- **Data Validation & Settings**: Pydantic v2 & Pydantic Settings
- **ORM & Database**: SQLAlchemy 2.0 with SQLite in **Write-Ahead Logging (WAL)** mode and strict foreign key constraints
- **Authentication**: PBKDF2 password hashing & PyJWT tokens (Localhost only)

### Local AI & Agents
- **Engine**: Ollama running locally at `http://127.0.0.1:11434`
- **Default Model**: `qwen2.5:1.5b` (lightweight, runs within 1.5 GB memory footprint)
- **Fallback Model**: `qwen2.5:0.5b` (ultra-low memory fallback)
- **Zero-Downtime Offline Heuristics**: Deterministic rule-based template generation when Ollama daemon is offline or restarting.
- **Context Limits**: Strict token context limits (2,048 tokens) and configurable request timeouts (60 seconds).

### Media Processing
- **Graphics Generation**: Pillow (PIL) vector-style template renderer generating 1080x1080 square promotional banners across 8 responsive brand templates.
- **Video & Reels Studio**: Standalone static FFmpeg binary (via `imageio-ffmpeg`) for 9:16 vertical video composition (540x960 fast preview / 1080x1920 full HD).

### Facebook Integration
- **Official Meta Graph API v20.0**: Compliant endpoints for feed publishing, photo upload, video reels, comments, and insights.
- **High-Fidelity Mock Sandbox**: A built-in zero-cost local sandbox simulating Meta Graph API calls, token health inspection, and comment sync for 100% offline development and validation.

---

## 4. Application Modules Overview

| Module | Route | Description |
|---|---|---|
| **Dashboard** | `/` | Operational KPI metrics, post status funnel, AI & Meta connectivity health, upcoming tasks. |
| **Brand Profile** | `/brand` | Configures brand name, tone, primary/secondary colors, target audience, verified prices, and prohibited claims. |
| **Niches** | `/niches` | Multi-niche management with slugs, target demographics, and preferred CTAs (E-Commerce, Tech, Lifestyle, etc.). |
| **Approval Center** | `/approvals` | Mandatory Human-in-the-Loop review hub with version comparison, anti-hallucination badges, and queue inspector. |
| **Content Calendar** | `/calendar` | Scheduled post timeline with drag-and-drop rescheduling and delay detection. |
| **Research Agent** | `/research` | Local AI topic discovery clearly labeled as local AI hypotheses (no fake live trends). |
| **Content Strategy** | `/strategy` | 7-day editorial calendar planner with educational, promotional, and engagement campaign mix. |
| **AI Content Studio** | `/studio` | Dual-language post caption generator (Bangla & English) with anti-hallucination price checks. |
| **Graphic Studio** | `/graphics` | 8 customizable vector/canvas templates exporting 1080x1080 PNG graphics locally. |
| **Reels Studio** | `/reels` | 3-scene vertical Reel scriptwriter and local FFmpeg MP4 video compositor. |
| **Media Library** | `/media-library` | Local file management for uploaded brand logos, product photos, and rendered Reels in `/data/media/`. |
| **Facebook Page** | `/facebook` | Official Meta Graph API connection manager, token expiry monitor, granular permissions health, and Mock Sandbox toggle. |
| **Comments Assistant** | `/comments` | Classifies visitor comments into 7 categories, drafts verified-price replies, and requires admin approval before posting. |
| **Facebook Messenger** | `/inbox` | Two-pane customer chat inbox with AI suggested replies held in PENDING state awaiting human approval. |
| **Leads CRM** | `/leads` | Captures buying signals and phone numbers automatically from comments/chats with CSV export. |
| **Analytics & Insights** | `/analytics` | Ground-truth reach, impressions, post engagements, and audience interaction charts with CSV export. |
| **AI Agents Telemetry** | `/agents` | Ollama model status, active agent inspector, prompt token efficiency, and offline template fallback logs. |
| **Notifications** | `/notifications` | Real-time alerts for pending human approvals, delayed posts, token warnings, and security events. |
| **Settings & Backups** | `/settings` | Hot SQLite database backups (`PRAGMA integrity_check`), one-click restore, and Windows Task Scheduler guide. |

---

## 5. Quickstart & Installation (Windows 10/11)

### Prerequisites
1. **Python 3.11+** installed (Python 3.14 supported).
2. **Node.js 18+** installed with npm.
3. **Ollama** installed on Windows (Download from [ollama.ai](https://ollama.ai/download)).
   - Pull the default model:
     ```powershell
     ollama pull qwen2.5:1.5b
     ```

### Backend Installation
1. Open PowerShell and navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Start the FastAPI local server:
   ```powershell
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   *The backend will automatically initialize the SQLite database, run schema migrations, and seed the default admin account.*

### Frontend Installation
1. Open a new PowerShell terminal and navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   cmd.exe /c npm install
   ```
3. Start the Vite development server:
   ```powershell
   cmd.exe /c npm run dev
   ```
4. Open Google Chrome and visit:
   ```
   http://localhost:5173
   ```

### Default Login Credentials
- **Username**: `admin`
- **Password**: `adminpassword123`

---

## 6. Windows Task Scheduler Automation (Zero-Cost)

To execute automated daily SQLite database backups completely free without running heavy 24/7 background tasks:

1. Open **Windows PowerShell as Administrator**.
2. Run the command provided in **Settings > Windows Task Scheduler Setup**:
   ```powershell
   $Action = New-ScheduledTaskAction -Execute "C:\Path\To\backend\venv\Scripts\python.exe" -Argument "-c `"from app.services.backup_service import create_database_backup; create_database_backup(actor='windows_task_scheduler')`"" -WorkingDirectory "C:\Path\To\backend"
   $Trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
   $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
   Register-ScheduledTask -TaskName "FacebookAIAgent_DailyBackup" -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily automated local SQLite backup for Facebook AI Agent"
   ```

---

## 7. Testing and Verification

The system includes a 40-test integration test suite covering all modules:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests/ -v
```

### Test Coverage Highlights
- **Phase 1**: Authentication, PBKDF2 hashing, multi-niche CRUD, Brand Profile, Audit logging (`8 passed`).
- **Phase 2**: Ollama provider offline handling, Quality Control anti-hallucination agent, Writing agent (Bangla/English), Strategy agent, Research agent (`6 passed`).
- **Phase 3**: Media uploads, 8-template Graphic Studio 1080x1080 rendering, 3-scene vertical Reel FFmpeg rendering, Content multi-version history (`5 passed`).
- **Phase 4**: Approval Center, Human-in-the-Loop gatekeeper, version invalidation upon post edits, Publishing queue idempotency (`4 passed`).
- **Phase 5**: Official Meta Graph API v20.0 client, Mock Sandbox mode, OAuth URL builder, Publisher Gatekeeper, Emergency Global Pause check (`7 passed`).
- **Phase 6**: Comments classification into 7 categories, Messenger inquiry drafting, anti-hallucination verified price protection, CRM Lead extraction (`6 passed`).
- **Phase 7**: Analytics overview & CSV export, Notifications lifecycle, SQLite hot backup & restore, Delay threshold detection (`4 passed`).

**Total: 40 passed, 0 failed.**

---

## 8. Security & Privacy Guarantees

- **No Remote Telemetry**: Zero data is sent to cloud analytics or third-party tracking services.
- **Strict Host Binding**: All backend endpoints bind strictly to `127.0.0.1` and reject non-localhost origins.
- **Secure Secret Handling**: Page access tokens and App Secrets are stored exclusively in the local encrypted SQLite database and are **never** exposed in frontend JavaScript, localStorage, or API responses.
- **Compliance with Meta Policies**: The system strictly uses official Meta Graph API endpoints. No scraping, unofficial bots, or browser automation is used.

---

## 9. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. All third-party dependencies are free, open-source software permitted for local use.
