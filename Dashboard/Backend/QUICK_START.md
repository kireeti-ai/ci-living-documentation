# Quick Start Guide

## Prerequisites
- Java 17
- MySQL Database running on localhost:3306
- Maven (included via wrapper)

## Setup Steps

### 1. Database Setup
```sql
CREATE DATABASE kireeti;
```

### 2. Update Database Credentials
Edit `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/your_database
spring.datasource.username=your_username
spring.datasource.password=your_password
```

### 3. Run the Application
```bash
./mvnw spring-boot:run
```

## Quick API Test

### Test 1: Register a User
```bash
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "role": "USER"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "username": "testuser",
  "role": "USER"
}
```

### Test 2: Register an Admin
```bash
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "role": "ADMIN"
  }'
```

### Test 3: Login as User
```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "testuser",
  "role": "USER",
  "message": "Authentication successful"
}
```

**IMPORTANT:** Copy the token from the response!

### Test 4: Access Protected Endpoint
Replace `YOUR_TOKEN` with the actual token from login:

```bash
curl -X GET http://localhost:8080/api/hello \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "message": "Welcome! You are logged in as: testuser",
  "role": "[ROLE_USER]"
}
```

### Test 5: Try User-Only Endpoint
```bash
curl -X GET http://localhost:8080/api/user \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "message": "Welcome User! This is a user-only endpoint."
}
```

### Test 6: Try Admin Endpoint (Should Fail)
```bash
curl -X GET http://localhost:8080/api/admin \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:** 403 Forbidden (because testuser has USER role, not ADMIN)

### Test 7: Login as Admin
```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

Copy the admin token.

### Test 8: Access Admin Endpoint (Should Succeed)
```bash
curl -X GET http://localhost:8080/api/admin \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Expected Response:**
```json
{
  "message": "Welcome Admin! This is an admin-only endpoint."
}
```

## Common Errors and Solutions

### Error: "Username already exists"
**Solution:** Use a different username or delete the existing user from the database.

### Error: "Invalid username or password"
**Solution:** Check your credentials. Passwords are case-sensitive.

### Error: 401 Unauthorized
**Solution:** 
1. Ensure you included the Authorization header
2. Check that the token is valid (not expired)
3. Format: `Authorization: Bearer <token>` (note the space after Bearer)

### Error: 403 Forbidden
**Solution:** You don't have the required role for this endpoint.
- `/api/user` requires USER role
- `/api/admin` requires ADMIN role

### Error: Cannot connect to MySQL
**Solution:**
1. Ensure MySQL is running: `brew services list` (Mac) or check your service manager
2. Verify database exists: `SHOW DATABASES;`
3. Check credentials in application.properties

## Project Structure Quick Reference

```
src/main/java/org/example/security/
├── config/              # Security configuration
│   ├── JwtFilter.java
│   └── SecurityConfig.java
├── controller/          # REST API endpoints
│   └── UserController.java
├── dto/                 # Data Transfer Objects
│   ├── AuthResponse.java
│   ├── LoginRequest.java
│   ├── RegisterRequest.java
│   └── UserResponse.java
├── exception/           # Error handling
│   └── GlobalExceptionHandler.java
├── model/               # Database entities
│   ├── UserPrincipal.java
│   └── Users.java
├── repo/                # Database repositories
│   └── UserRepo.java
├── service/             # Business logic
│   ├── JWTService.java
│   ├── MyUserDetailsService.java
│   └── UserService.java
└── SecurityApplication.java
```

## Environment Variables (Production)

For production, use environment variables instead of hardcoded values:

```bash
export JWT_SECRET="your-very-secure-secret-key-at-least-32-characters"
export DB_URL="jdbc:mysql://your-db-host:3306/your_database"
export DB_USERNAME="your_username"
export DB_PASSWORD="your_password"
```

Update `application.properties`:
```properties
jwt.secret=${JWT_SECRET}
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
```

## Useful Commands

### Build the project
```bash
./mvnw clean install
```

### Run tests
```bash
./mvnw test
```

### Package as JAR
```bash
./mvnw package
```

### Run the JAR
```bash
java -jar target/security-0.0.1-SNAPSHOT.jar
```

### Check dependencies
```bash
./mvnw dependency:tree
```

## Support

For detailed API documentation, see [README.md](README.md)

For a complete list of improvements, see [IMPROVEMENTS.md](IMPROVEMENTS.md)

