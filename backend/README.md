# CI Living Documentation Backend

Node.js backend with Express, Drizzle ORM, and PostgreSQL.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create PostgreSQL database:**
   ```sql
   CREATE DATABASE ci_living_docs;
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials and JWT secret
   ```

4. **Run database migrations:**
   
   Option A - Using Drizzle migrations:
   ```bash
   npm run db:migrate
   ```

   Option B - Using SQL files directly:
   ```bash
   psql -U postgres -f sql/001_create_tables.sql
   psql -U postgres -d ci_living_docs -f sql/002_seed_admin.sql
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

   Server runs on http://localhost:8000

## API Endpoints

### Auth Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register a new user |
| POST | `/auth/signup/verify_otp` | Verify email with OTP |
| POST | `/auth/resend_otp` | Resend OTP code |
| POST | `/auth/login` | Login user |
| POST | `/auth/logout` | Logout user |
| GET | `/auth/me` | Get current user |

### Users Routes (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get all users |
| POST | `/users` | Create a new user |
| PATCH | `/users/:userId/role` | Update user role |
| DELETE | `/users/:userId` | Delete a user |

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate new migrations
npm run db:generate

# Push schema changes directly
npm run db:push

# Open Drizzle Studio (DB GUI)
npm run db:studio
```

## Default Admin Account

After running the seed SQL, you can login with:
- **Email:** admin@example.com
- **Password:** admin123

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `PORT` | Server port | `8000` |
| `NODE_ENV` | Environment | `development` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | Required for email |
| `SMTP_PASS` | SMTP password | Required for email |
| `SMTP_FROM` | Email sender address | Required for email |

**Note:** In development mode, OTP codes are logged to the console instead of being sent via email.
