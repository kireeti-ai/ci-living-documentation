# Authentication System

Full-stack authentication system with React + Redux frontend and FastAPI + Supabase backend.

## Features

- ✅ Email + OTP signup verification
- ✅ JWT access token authentication
- ✅ Redux state management
- ✅ Admin user management (Settings page)
- ✅ Role-based access control (Admin/User)
- ✅ Protected routes

## Project Structure

```
├── frontend/                   # React + TypeScript + Redux
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── Navbar.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── pages/             # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── VerifyOTP.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/          # API services
│   │   │   └── api.ts
│   │   ├── store/             # Redux store
│   │   │   ├── index.ts
│   │   │   ├── hooks.ts
│   │   │   └── slices/
│   │   │       ├── authSlice.ts
│   │   │       └── usersSlice.ts
│   │   ├── styles/
│   │   │   └── index.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                    # FastAPI + Supabase
│   ├── app/
│   │   ├── routes/            # API routes
│   │   │   ├── auth.py
│   │   │   └── users.py
│   │   ├── schemas/           # Pydantic models
│   │   │   └── auth.py
│   │   ├── utils/             # Utility functions
│   │   │   ├── security.py    # JWT & password handling
│   │   │   └── otp.py         # OTP generation & email
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   └── main.py
│   ├── database/
│   │   └── schema.sql         # Database schema
│   ├── requirements.txt
│   └── .env
```

## Setup Instructions

### 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run the contents of `backend/database/schema.sql`
3. Get your credentials from **Settings > API**:
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_KEY`: Use the `service_role` key (NOT anon key)

### 2. Backend Setup

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Edit .env file with your Supabase and SMTP credentials
```

**Configure `.env` file:**

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

# JWT
JWT_SECRET_KEY=generate-a-strong-secret-key-at-least-32-chars

# SMTP (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Auth System

# OTP
OTP_EXPIRE_MINUTES=10
```

**Gmail App Password:**
1. Enable 2FA on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use this password as `SMTP_PASSWORD`

**Start the backend:**

```powershell
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000

### 3. Frontend Setup

```powershell
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: http://localhost:5173

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user (sends OTP) |
| POST | `/api/auth/verify-otp` | Verify OTP and complete registration |
| POST | `/api/auth/resend-otp` | Resend OTP to email |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user profile |

### Users (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| POST | `/api/users` | Create new user (skip OTP) |
| PATCH | `/api/users/{id}/role` | Update user role |
| DELETE | `/api/users/{id}` | Delete user |

## Authentication Flow

### Signup Flow
```
1. User fills signup form
2. Frontend sends POST /api/auth/signup
3. Backend creates pending_user + generates OTP + sends email
4. User enters OTP on verify page
5. Frontend sends POST /api/auth/verify-otp
6. Backend verifies OTP + creates user + returns access_token
7. Frontend stores token + redirects to dashboard
```

### Login Flow
```
1. User fills login form
2. Frontend sends POST /api/auth/login
3. Backend validates credentials + returns access_token
4. Frontend stores token + redirects to dashboard
```

## First User is Admin

The first user to register through OTP verification automatically becomes an admin. This ensures there's always an admin to manage other users.

## Access Token Handling

- Token stored in `localStorage`
- Automatically attached to API requests via Axios interceptor
- On 401 response, user is redirected to login
- Token expires after 60 minutes (configurable)

## Pages

| Page | Path | Access |
|------|------|--------|
| Login | `/login` | Public |
| Signup | `/signup` | Public |
| Verify OTP | `/verify-otp` | Public |
| Dashboard | `/dashboard` | Authenticated |
| Settings | `/settings` | Admin only |

## Development

### Run Both Servers

Terminal 1 (Backend):
```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

Terminal 2 (Frontend):
```powershell
cd frontend
npm run dev
```

### API Documentation

With backend running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
