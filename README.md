# Innovation Team Memphis — Project Management Portal

A premium, full-stack project management portal built for Innovation Team Memphis.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, @dnd-kit, Recharts
- **Backend**: Python Flask, SQLAlchemy, Flask-JWT-Extended, bcrypt
- **Database**: SQLite (file-based, persistent)

## Features

- 🔐 JWT authentication with role-based access (Director, Manager, Team Member, Viewer)
- 📊 Dashboard with project stats and activity feed
- 📁 Full project CRUD with status, priority, progress tracking
- 🗂 Drag-and-drop Kanban board (To Do → In Progress → Review → Done)
- 👥 Team directory with workload view
- 📎 Document upload and management per project
- 📈 Reports with charts, Gantt timeline, PDF export
- 🔔 In-app notifications
- 🌙 Dark/Light mode toggle
- 📋 Audit log (Director only)
- ⏱ Auto-logout after 30 minutes of inactivity

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+

### Backend Setup

```bash
cd innovation-memphis

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
cd backend && python app.py
```

Backend runs on **http://localhost:5001**

### Frontend Setup

```bash
cd innovation-memphis/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs on **http://localhost:5173**

## Pre-loaded Data

On first startup, the backend seeds:

**Director Account**
- Email: `director@innovationmemphis.gov`
- Password: `Memphis2026!`
- Role: Director

**Team Members** (all use password `Memphis2026!`)
- Sarah Chen — Manager
- Marcus Johnson — Team Member
- Amara Osei — Team Member
- Derek Williams — Team Member
- Jasmine Taylor — Viewer

**Sample Project**: Home 901 Website Revamp (In Progress, 65%)

## Role Permissions

| Action | Director | Manager | Team Member | Viewer |
|--------|----------|---------|-------------|--------|
| View projects | ✅ | ✅ | ✅ (assigned) | ✅ (assigned) |
| Create projects | ✅ | ✅ | ❌ | ❌ |
| Delete projects | ✅ | ❌ | ❌ | ❌ |
| Manage team | ✅ | ✅ | ❌ | ❌ |
| View reports | ✅ | ✅ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ | ❌ |

## Project Structure

```
innovation-memphis/
├── api/
│   └── index.py            # Vercel Python Function entrypoint
├── backend/
│   ├── app.py              # Flask app + seed data
│   ├── models.py           # SQLAlchemy models
│   ├── auth.py             # JWT utils + role decorators
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── project_routes.py
│   │   ├── task_routes.py
│   │   ├── team_routes.py
│   │   ├── document_routes.py
│   │   ├── report_routes.py
│   │   └── notification_routes.py
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API clients
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth + Theme context
│   │   └── pages/          # Route pages
│   ├── package.json
│   └── tailwind.config.js
├── requirements.txt         # Backend deps (shared by local dev + Vercel)
├── vercel.json
└── README.md
```

## Environment Variables

Backend `.env`:
```
SECRET_KEY=your-flask-secret
JWT_SECRET_KEY=your-jwt-secret
```

## Production Build

```bash
# Build frontend
cd frontend && npm run build

# The Flask backend serves the built frontend from /
cd backend && python app.py
```
