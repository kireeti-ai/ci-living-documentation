# Spring Security JWT Authentication & Authorization

This is a secure Spring Boot application with JWT-based authentication and role-based authorization.

## Features

✅ **JWT Authentication** - Stateless token-based authentication  
✅ **Role-Based Authorization** - USER and ADMIN roles with method-level security  
✅ **Password Encryption** - BCrypt password hashing (strength 12)  
✅ **Input Validation** - Request validation with proper error messages  
✅ **Global Exception Handling** - Centralized error responses  
✅ **Secure Configuration** - Configurable JWT secret and expiration  

## Technology Stack

- **Java 17**
- **Spring Boot 4.0.1**
- **Spring Security**
- **JWT (jjwt 0.13.0)**
- **MySQL Database**
- **JPA/Hibernate**

## Project Structure

```
src/main/java/org/example/security/
├── config/
│   ├── JwtFilter.java           # JWT token validation filter
│   └── SecurityConfig.java       # Security configuration
├── controller/
│   └── UserController.java       # REST API endpoints
├── dto/
│   ├── AuthResponse.java         # Login response DTO
│   ├── LoginRequest.java         # Login request DTO
│   ├── RegisterRequest.java      # Registration request DTO
│   └── UserResponse.java         # User info response DTO
├── exception/
│   └── GlobalExceptionHandler.java # Global error handling
├── model/
│   ├── UserPrincipal.java        # UserDetails implementation
│   └── Users.java                # User entity
├── repo/
│   └── UserRepo.java             # User repository
├── service/
│   ├── JWTService.java           # JWT token operations
│   ├── MyUserDetailsService.java # UserDetailsService implementation
│   └── UserService.java          # Business logic
└── SecurityApplication.java      # Main application
```

## Setup Instructions

### 1. Database Configuration

Update `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/your_database
spring.datasource.username=your_username
spring.datasource.password=your_password
```

### 2. JWT Secret (Optional)

Update the JWT secret in `application.properties`:

```properties
jwt.secret=your-secure-secret-key-here-minimum-32-characters
jwt.expiration=3600000
```

### 3. Run the Application

```bash
./mvnw clean install
./mvnw spring-boot:run
```

The application will start on `http://localhost:8080`

## API Endpoints

### Public Endpoints (No Authentication Required)

#### 1. Register a New User

```bash
POST /api/register
Content-Type: application/json

{
  "username": "john",
  "password": "password123",
  "role": "USER"
}
```

**Response:**
```json
{
  "id": 1,
  "username": "john",
  "role": "USER"
}
```

#### 2. Login

```bash
POST /api/login
Content-Type: application/json

{
  "username": "john",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "username": "john",
  "role": "USER",
  "message": "Authentication successful"
}
```

### Protected Endpoints (Authentication Required)

#### 3. Hello (USER or ADMIN role)

```bash
GET /api/hello
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "message": "Welcome! You are logged in as: john",
  "role": "[ROLE_USER]"
}
```

#### 4. User-Only Endpoint (USER role)

```bash
GET /api/user
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "message": "Welcome User! This is a user-only endpoint."
}
```

#### 5. Admin-Only Endpoint (ADMIN role)

```bash
GET /api/admin
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "message": "Welcome Admin! This is an admin-only endpoint."
}
```

## Testing with cURL

### Register a User

```bash
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123",
    "role": "USER"
  }'
```

### Register an Admin

```bash
curl -X POST http://localhost:8080/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "role": "ADMIN"
  }'
```

### Login

```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

Save the token from the response.

### Access Protected Endpoint

```bash
curl -X GET http://localhost:8080/api/hello \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Access Admin Endpoint (with ADMIN token)

```bash
curl -X GET http://localhost:8080/api/admin \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN_HERE"
```

## Testing with Postman

1. **Register**: POST to `http://localhost:8080/api/register` with JSON body
2. **Login**: POST to `http://localhost:8080/api/login` with credentials
3. **Copy the token** from login response
4. **Add Authorization Header**: 
   - Key: `Authorization`
   - Value: `Bearer <your-token>`
5. **Access protected endpoints** with the token

## Security Features

### 1. Password Security
- Passwords are encrypted using BCrypt with strength 12
- Passwords are never stored or returned in plain text

### 2. JWT Token Security
- Tokens expire after 1 hour (configurable)
- Tokens are signed with HMAC-SHA256
- Token validation on every request to protected endpoints

### 3. Role-Based Access Control
- `@PreAuthorize` annotations for method-level security
- Roles: USER, ADMIN
- Flexible permission system

### 4. Stateless Authentication
- No server-side session storage
- Scalable architecture
- JWT contains all necessary information

### 5. Input Validation
- Request validation using Jakarta Bean Validation
- Proper error messages for invalid inputs

## Error Handling

The application provides proper error responses:

### Validation Errors (400 Bad Request)
```json
{
  "username": "Username is required",
  "password": "Password must be at least 6 characters"
}
```

### Authentication Errors (401 Unauthorized)
```json
{
  "error": "Invalid username or password"
}
```

### Authorization Errors (403 Forbidden)
```json
{
  "error": "Access Denied"
}
```

## Removed Unnecessary Files

The following files were removed as they were not related to authentication/authorization:

- ❌ `HelloController.java` - Redundant controller
- ❌ `StudentController.java` - Unrelated to auth
- ❌ `Student.java` - Unrelated model

## Improvements Made

1. ✅ Fixed typo: `UserPrinicipal` → `UserPrincipal`
2. ✅ Added role-based authorization with USER and ADMIN roles
3. ✅ Created DTOs for better API design (AuthResponse, LoginRequest, RegisterRequest, UserResponse)
4. ✅ Improved JWT service with configurable secret and expiration
5. ✅ Added input validation with proper error messages
6. ✅ Implemented global exception handler
7. ✅ Enhanced security configuration with method-level security
8. ✅ Added proper database constraints (unique username, not null fields)
9. ✅ Updated endpoints to use `/api/*` prefix for better organization
10. ✅ Improved error responses with meaningful messages

## Development Tips

- Use different roles (USER, ADMIN) to test authorization
- Check console logs for SQL queries (spring.jpa.show-sql=true)
- Token expiration can be adjusted in application.properties
- Add more roles by extending the Users entity and UserPrincipal class

## License

This project is for educational purposes.

