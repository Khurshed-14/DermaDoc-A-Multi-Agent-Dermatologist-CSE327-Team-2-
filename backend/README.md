<div align="center">
  <img src="../frontend/public/logo.png" alt="DermaDoc Logo" width="200" />
</div>

# DermaDoc Backend

FastAPI backend for DermaDoc application with MongoDB, PyTorch-based skin lesion classification, and Google Gemini AI integration.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Architecture](#architecture)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The DermaDoc backend provides:

- **RESTful API** for frontend communication
- **User Authentication** with JWT tokens
- **Skin Lesion Classification** using PyTorch EfficientNet-B4 model
- **AI Chatbot** powered by Google Gemini 2.5 Flash Lite
- **File Storage** for user images and skin check results
- **Background Task Processing** for async image classification

## 🛠️ Tech Stack

- **FastAPI** 0.115+ - Modern, fast web framework for building APIs
- **MongoDB** - NoSQL database (Motor for async operations)
- **PyTorch** 2.0+ - Deep learning framework for skin classification
- **Google Generative AI** - Gemini API for chatbot
- **Passlib** - Password hashing with bcrypt
- **Python-JOSE** - JWT token handling
- **Pydantic** 2.9+ - Data validation and settings management
- **uv** - Fast Python package manager
- **Uvicorn** - ASGI server
- **aiofiles** - Async file operations

## 📦 Prerequisites

- **Python** 3.11 or higher
- **MongoDB** 6.0+ running on `mongodb://localhost:27017/` (or configure remote)
- **uv** package manager installed
- **Google Gemini API Key** (for chatbot functionality)
- **PyTorch-compatible system** (CPU or CUDA-enabled GPU recommended)

## 🔧 Installation

### 1. Install uv

**Windows (PowerShell):**
```powershell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS/Linux:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Install Dependencies

```bash
cd backend
uv sync
```

This will:
- Create a virtual environment automatically
- Install all dependencies from `pyproject.toml`
- Generate `uv.lock` file for reproducible builds

### 3. Verify Installation

```bash
# Check Python version
uv run python --version  # Should be 3.11+

# Test imports
uv run python -c "import fastapi; import torch; print('All imports successful')"
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
# Edit .env with your settings
```

### Required Environment Variables

```env
# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017/
MONGODB_DB_NAME=Dermadoc

# Security
SECRET_KEY=your-secret-key-change-this-in-production-use-a-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS (comma-separated list)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173

# Google Gemini API (Required for chatbot)
GEMINI_API_KEY=your-gemini-api-key-here

# Chat Token Limits
CHAT_MAX_OUTPUT_TOKENS=1024
CHAT_MAX_INPUT_TOKENS=8000
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file

### Optional: Remote MongoDB

If using MongoDB Atlas or a remote MongoDB instance:

```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
```

## 🚀 Running the Server

### Development Mode (with auto-reload)

```bash
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Or with Gunicorn:

```bash
uv run gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Verify Server is Running

- **API Root**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📚 API Documentation

Once the server is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔌 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/signup` | Register a new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user info | Yes |
| POST | `/api/auth/logout` | Logout (client should delete token) | No |
| PUT | `/api/auth/profile` | Update user profile | Yes |
| POST | `/api/auth/change-password` | Change user password | Yes |
| POST | `/api/auth/upload-image` | Upload user profile image | Yes |
| DELETE | `/api/auth/delete-image` | Delete user profile image | Yes |

### Chat Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/chat/chat` | Chat with AI (streaming) | Yes |
| POST | `/api/chat/sync` | Chat with AI (synchronous) | Yes |

### Skin Check Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/skin-check/upload` | Upload skin check image | Yes |
| GET | `/api/skin-check/images` | Get all user's images | Yes |
| GET | `/api/skin-check/images/{image_id}` | Get specific image | Yes |
| PUT | `/api/skin-check/images/{image_id}` | Update image metadata | Yes |
| DELETE | `/api/skin-check/images/{image_id}` | Delete image | Yes |
| DELETE | `/api/skin-check/images` | Bulk delete images | Yes |
| GET | `/api/skin-check/results` | Get all processed results | Yes |
| GET | `/api/skin-check/results/{image_id}` | Get specific result | Yes |

### Storage Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/storage/{file_path}` | Serve stored files | No* |

*Files are served publicly but paths are obfuscated

## 🗄️ Database Schema

### Database: `Dermadoc`

### Collection: `Users`

```json
{
  "_id": ObjectId,
  "name": string,
  "email": string (unique, indexed),
  "hashed_password": string (bcrypt),
  "birthdate": string (ISO date format: YYYY-MM-DD),
  "gender": string ("male" | "female" | "other"),
  "image_path": string | null,
  "created_at": datetime,
  "updated_at": datetime
}
```

### Collection: `SkinCheckImages`

```json
{
  "_id": ObjectId,
  "relative_path": string,
  "user_id": ObjectId (reference to Users._id),
  "status": string ("pending" | "processing" | "completed" | "failed"),
  "disease_type": string | null ("AKIEC" | "BCC" | "BKL" | "DF" | "MEL" | "NV" | "VASC"),
  "body_part": string | null,
  "confidence": float | null (0.0 - 1.0),
  "predictions": object | null {
    "AKIEC": float,
    "BCC": float,
    "BKL": float,
    "DF": float,
    "MEL": float,
    "NV": float,
    "VASC": float
  },
  "gemini_recommendation": string | null,
  "gemini_description": string | null,
  "created_at": datetime,
  "updated_at": datetime
}
```

### Disease Types

The model classifies 7 types of skin lesions:

- **AKIEC** - Actinic keratoses and intraepithelial carcinoma
- **BCC** - Basal cell carcinoma
- **BKL** - Benign keratosis-like lesions
- **DF** - Dermatofibroma
- **MEL** - Melanoma
- **NV** - Melanocytic nevi
- **VASC** - Vascular lesions

## 🏗️ Architecture

### Request Flow

```
Client Request
    │
    ▼
FastAPI Router
    │
    ├─── Authentication Middleware (JWT)
    │
    ├─── Route Handler
    │       │
    │       ├─── Database Operations (Motor/MongoDB)
    │       ├─── File Storage Operations
    │       ├─── Background Tasks (Image Processing)
    │       └─── External API Calls (Gemini)
    │
    ▼
Response (JSON/Streaming)
```

### Background Task Processing

1. User uploads image → Image saved to storage
2. Database record created with `status: "pending"`
3. Background task triggered
4. Task loads PyTorch model and processes image
5. Predictions generated and stored
6. Gemini AI generates personalized recommendations
7. Database record updated with `status: "completed"`

### File Storage Structure

```
storage/
├── user_images/
│   └── {user_id}/
│       └── {uuid}.{ext}
│
└── skin_check_images/
    └── {user_id}/
        ├── {image_id}/
        │   ├── original.{ext}
        │   └── processed/
        │       └── processed.{ext}
```

## 💻 Development

### Project Structure

```
backend/
├── app/
│   ├── core/
│   │   ├── config.py         # Settings and environment variables
│   │   ├── database.py       # MongoDB connection and utilities
│   │   ├── security.py       # JWT and password hashing
│   │   └── storage.py        # File storage utilities
│   ├── models/
│   │   ├── user.py           # User Pydantic models
│   │   ├── chat.py           # Chat Pydantic models
│   │   └── skin_check.py     # Skin check Pydantic models
│   ├── routers/
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── chat.py           # Streaming chat endpoint
│   │   ├── chat_sync.py      # Synchronous chat endpoint
│   │   └── skin_check.py     # Skin check endpoints
│   └── services/
│       ├── classifier.py     # PyTorch model and classification logic
│       └── background_tasks.py # Background task processing
├── CNN models/
│   └── efficientnetb4_classifier.pth  # Trained PyTorch model
├── storage/                   # User-uploaded files (gitignored)
├── main.py                    # FastAPI application entry point
├── pyproject.toml            # Dependencies and project config
└── README.md                 # This file
```

### Adding New Dependencies

```bash
# Add a production dependency
uv add package-name

# Add a development dependency
uv add --dev package-name

# Update all dependencies
uv sync --upgrade
```

### Running Tests

```bash
# Install test dependencies (if you add them)
uv add --dev pytest pytest-asyncio

# Run tests
uv run pytest
```

### Code Style

- Follow **PEP 8** style guide
- Use **type hints** for all function parameters and return types
- Document functions with **docstrings**
- Use **async/await** for I/O operations

Example:

```python
from typing import Optional
from app.models.user import User

async def get_user_by_id(user_id: str) -> Optional[User]:
    """
    Retrieve a user by their ID from the database.
    
    Args:
        user_id: The user's unique identifier
        
    Returns:
        User object if found, None otherwise
    """
    # Implementation
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Error**: `Database connection not available`

**Solutions**:
1. Verify MongoDB is running: `mongosh` or check service status
2. Check `MONGODB_URL` in `.env` file
3. For remote MongoDB, verify network connectivity and credentials

### Gemini API Errors

**Error**: `Gemini API key not configured`

**Solutions**:
1. Verify `GEMINI_API_KEY` is set in `.env` file
2. Check for extra spaces or newlines in the API key
3. Verify the API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)

### PyTorch Model Loading Issues

**Error**: Model file not found or loading errors

**Solutions**:
1. Ensure `CNN models/efficientnetb4_classifier.pth` exists
2. Check PyTorch version compatibility
3. Verify CUDA availability if using GPU: `uv run python -c "import torch; print(torch.cuda.is_available())"`

### Port Already in Use

**Error**: `Address already in use`

**Solutions**:
1. Change port: `uv run uvicorn main:app --port 8001`
2. Kill process using port 8000:
   - Windows: `netstat -ano | findstr :8000` then `taskkill /PID <pid> /F`
   - Linux/macOS: `lsof -ti:8000 | xargs kill`

### CORS Issues

**Error**: CORS policy blocking requests

**Solutions**:
1. Add frontend URL to `CORS_ORIGINS` in `.env`
2. Restart the server after changing CORS settings
3. Check browser console for specific CORS error details

### File Upload Issues

**Error**: File storage errors

**Solutions**:
1. Ensure `storage/` directory exists and is writable
2. Check disk space availability
3. Verify file size limits (default: 10MB per file)

## 📝 Notes

- The PyTorch model (`efficientnetb4_classifier.pth`) should be placed in `CNN models/` directory
- First request after server start may be slower due to model loading
- Background tasks are processed asynchronously - check status via API
- JWT tokens expire after 30 minutes by default (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)

## 🔒 Security Considerations

- **Never commit** `.env` file to version control
- Use strong `SECRET_KEY` in production (generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)
- Keep `GEMINI_API_KEY` secure and rotate if compromised
- Use HTTPS in production
- Implement rate limiting for production deployments
- Validate and sanitize all user inputs

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Motor Documentation](https://motor.readthedocs.io/)
- [PyTorch Documentation](https://pytorch.org/docs/)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [uv Documentation](https://github.com/astral-sh/uv)

---

For frontend setup and overall project documentation, see [../README.md](../README.md).
