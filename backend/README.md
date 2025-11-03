# DermaDoc Backend

FastAPI backend for DermaDoc application with MongoDB.

## Tech Stack

- **FastAPI** - Modern, fast web framework for building APIs
- **MongoDB** - NoSQL database (Motor for async operations)
- **Passlib** - Password hashing with bcrypt
- **Python-JOSE** - JWT token handling
- **Pydantic** - Data validation
- **uv** - Fast Python package manager

## Setup

### Prerequisites

- Python 3.11+
- MongoDB running on `mongodb://localhost:27017/`
- `uv` package manager installed

### Installation

1. **Install uv** (if not already installed):
```bash
# On Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# On macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. **Install dependencies**:
```bash
cd backend
uv sync
```

This will create a virtual environment and install all dependencies.

3. **Configure environment variables**:
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Start MongoDB** (if not running):
Make sure MongoDB is running on `mongodb://localhost:27017/`

5. **Run the development server**:
```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or using uv directly:
```bash
uv run python -m uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info (requires authentication)
- `POST /api/auth/logout` - Logout (client should delete token)

## Database

- **Database**: `Dermadoc`
- **Collection**: `Users`

### User Schema

```json
{
  "_id": ObjectId,
  "name": string,
  "email": string,
  "hashed_password": string (bcrypt),
  "birthdate": string (ISO date),
  "gender": string,
  "created_at": datetime,
  "updated_at": datetime
}
```

## Security

- Passwords are hashed using bcrypt via Passlib
- JWT tokens for authentication
- CORS configured for frontend access

## Development

### Run with auto-reload:
```bash
uv run uvicorn main:app --reload
```

### Run tests (if you add them):
```bash
uv run pytest
```

## Project Structure

```
backend/
├── app/
│   ├── core/
│   │   ├── config.py      # Configuration settings
│   │   ├── database.py    # MongoDB connection
│   │   └── security.py    # Password hashing & JWT
│   ├── models/
│   │   └── user.py        # Pydantic models
│   └── routers/
│       └── auth.py        # Authentication endpoints
├── main.py                # FastAPI application
├── pyproject.toml        # Dependencies (uv)
└── .env.example           # Environment variables template
```

