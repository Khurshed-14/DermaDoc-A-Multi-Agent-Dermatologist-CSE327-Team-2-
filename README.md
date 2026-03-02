<div align="center">
  <img src="frontend/public/logo.png" alt="DermaDoc Logo" width="200" />
</div>

# DermaDoc: A Multi-Agent Dermatologist

A Project for CSE327 - Software Engineering | North South University

**DermaDoc** is an AI-powered skin health assistant that helps users analyze skin conditions, get personalized recommendations, and chat with an AI dermatologist. The application uses deep learning models for skin lesion classification and Google Gemini AI for intelligent conversations about skin health.

## 🚀 Features

- **AI-Powered Skin Analysis**: Upload skin images and get instant predictions for 7 different skin conditions
- **Intelligent Chatbot**: Chat with DermaDoc, a specialized AI assistant for dermatology questions
- **Personalized Recommendations**: Get tailored advice based on your skin analysis results
- **User Dashboard**: Track your skin check history and results
- **Secure Authentication**: JWT-based authentication with password hashing
- **Real-time Processing**: Background task processing for image classification

## 📋 Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Demo](#demo)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🏗️ Architecture

DermaDoc follows a **full-stack architecture** with clear separation between frontend and backend:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   React Frontend│  ──────▶│  FastAPI Backend│  ──────▶│    MongoDB      │
│   (Port 5173)   │         │   (Port 8000)   │         │  (Port 27017)   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  Google Gemini  │
                            │      API       │
                            └─────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │  PyTorch Model  │
                            │  (EfficientNet) │
                            └─────────────────┘
```

### Components

1. **Frontend**: React SPA with Vite, Tailwind CSS, and shadcn/ui components
2. **Backend**: FastAPI REST API with async MongoDB operations
3. **Database**: MongoDB for user data and skin check results
4. **AI Services**: 
   - Google Gemini 2.5 Flash Lite for chatbot
   - PyTorch EfficientNet-B4 for skin lesion classification

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **TanStack Query** - Data fetching and state management
- **React Router** - Client-side routing
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database
- **Motor** - Async MongoDB driver
- **PyTorch** - Deep learning framework
- **Google Generative AI** - Gemini API integration
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **uv** - Fast Python package manager

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and **pnpm** (or npm/yarn)
- **Python** 3.11+
- **MongoDB** 6.0+ (running locally or remote)
- **uv** package manager (for Python)
- **Google Gemini API Key** (for chatbot functionality)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DermaDoc
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install uv (if not already installed)
# Windows (PowerShell):
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# macOS/Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Create .env file
cp .env.example .env
# Edit .env with your configuration (see Backend README for details)

# Start MongoDB (if running locally)
# Windows: mongod
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# Run the backend server
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The frontend will be available at `http://localhost:5173`

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Demo

https://github.com/user-attachments/assets/70c94989-e950-4916-bca2-994c246e8059

## 📁 Project Structure

```
DermaDoc-A-Multi-Agent-Dermatologist-CSE327-Team-2-/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── Chatbot.jsx  # AI chatbot component
│   │   │   ├── Header.jsx
│   │   │   └── ...
│   │   ├── pages/           # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SkinCheck.jsx
│   │   │   ├── Results.jsx
│   │   │   └── ...
│   │   ├── contexts/        # React contexts
│   │   │   ├── AuthContext.jsx
│   │   │   └── ChatbotContext.jsx
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions
│   │   │   ├── api.js       # API client
│   │   │   └── utils.js
│   │   └── main.jsx         # Entry point
│   ├── public/              # Static assets
│   │   └── logo.png
│   ├── package.json
│   └── vite.config.js
│
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── core/            # Core configuration
│   │   │   ├── config.py    # Settings and environment variables
│   │   │   ├── database.py  # MongoDB connection
│   │   │   ├── security.py  # JWT and password hashing
│   │   │   └── storage.py   # File storage utilities
│   │   ├── models/          # Pydantic models
│   │   │   ├── user.py
│   │   │   ├── chat.py
│   │   │   └── skin_check.py
│   │   ├── routers/         # API route handlers
│   │   │   ├── auth.py      # Authentication endpoints
│   │   │   ├── chat.py      # Chatbot endpoints (streaming)
│   │   │   ├── chat_sync.py # Chatbot endpoints (sync)
│   │   │   └── skin_check.py # Skin check endpoints
│   │   └── services/        # Business logic
│   │       ├── classifier.py      # Skin lesion classification
│   │       └── background_tasks.py # Async task processing
│   ├── CNN models/          # Trained PyTorch models
│   │   └── efficientnetb4_classifier.pth
│   ├── storage/             # User-uploaded files
│   │   ├── user_images/
│   │   └── skin_check_images/
│   ├── main.py              # FastAPI application entry point
│   ├── pyproject.toml       # Python dependencies
│   └── README.md            # Backend-specific documentation
│
└── README.md                # This file
```

## 💻 Development

### Frontend Development

```bash
cd frontend

# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Install new dependencies
pnpm add <package-name>

# Install dev dependencies
pnpm add -D <package-name>
```

### Backend Development

```bash
cd backend

# Run with auto-reload
uv run uvicorn main:app --reload

# Run with specific host and port
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Add new dependencies
uv add <package-name>

# Add dev dependencies
uv add --dev <package-name>
```

### Environment Variables

See [backend/README.md](backend/README.md) for detailed environment variable configuration.

## 🚢 Deployment

### Frontend Deployment

1. Build the production bundle:
```bash
cd frontend
pnpm build
```

2. The `dist/` folder contains the production-ready files
3. Deploy to your preferred hosting service (Vercel, Netlify, etc.)

### Backend Deployment

1. Ensure all environment variables are set in production
2. Use a production ASGI server:
```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

3. Or use Gunicorn with Uvicorn workers:
```bash
uv run gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

4. Set up MongoDB (local or cloud like MongoDB Atlas)
5. Configure CORS origins for your frontend domain

## 📚 Additional Documentation

- [Backend README](backend/README.md) - Detailed backend documentation, API endpoints, and database schemas
- [API Documentation](http://localhost:8000/docs) - Interactive Swagger UI (when backend is running)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **Frontend**: Follow React best practices, use ESLint/Prettier
- **Backend**: Follow PEP 8, use type hints, document functions

## 📝 License

This project is part of CSE327 - Software Engineering course at North South University.

## 👥 Team

CSE327 Team 2

---

For detailed API documentation and backend setup instructions, see [backend/README.md](backend/README.md).
