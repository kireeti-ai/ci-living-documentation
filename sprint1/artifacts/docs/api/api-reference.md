# API Reference

**Total Endpoints:** 20

---

## Endpoints by File

### `backend/src/main/java/com/exl/quizapp/controller/AIController.java`

**Language:** java

- **Method:** POST
  **Path:** `/ai/generate`
  **Summary:** Create ai.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/ai/generate"`

### `backend/src/main/java/com/exl/quizapp/controller/QuestionController.java`

**Language:** java

- **Method:** DELETE
  **Path:** `/question/delete/{id}`
  **Summary:** Delete question.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X DELETE "<base-url>/question/delete/{id}"`
- **Method:** GET
  **Path:** `/question/category/{category}`
  **Summary:** Retrieve question data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: category
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/question/category/{category}"`
- **Method:** GET
  **Path:** `/question/my-questions`
  **Summary:** Retrieve question data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/question/my-questions"`
- **Method:** POST
  **Path:** `/question/add`
  **Summary:** Create question.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/question/add"`
- **Method:** POST
  **Path:** `/question/add-batch`
  **Summary:** Create question.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/question/add-batch"`
- **Method:** PUT
  **Path:** `/question/update/{id}`
  **Summary:** Update question.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X PUT "<base-url>/question/update/{id}"`

### `backend/src/main/java/com/exl/quizapp/controller/QuizController.java`

**Language:** java

- **Method:** GET
  **Path:** `/quiz/all`
  **Summary:** Retrieve quiz data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/quiz/all"`
- **Method:** GET
  **Path:** `/quiz/code/{code}`
  **Summary:** Retrieve quiz data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: code
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/quiz/code/{code}"`
- **Method:** GET
  **Path:** `/quiz/get/{id}`
  **Summary:** Retrieve quiz data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/quiz/get/{id}"`
- **Method:** GET
  **Path:** `/quiz/my-quizzes`
  **Summary:** Retrieve quiz data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/quiz/my-quizzes"`
- **Method:** GET
  **Path:** `/quiz/result/{id}`
  **Summary:** Retrieve quiz data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/quiz/result/{id}"`
- **Method:** POST
  **Path:** `/quiz/create`
  **Summary:** Create quiz.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/quiz/create"`
- **Method:** POST
  **Path:** `/quiz/submit/{id}`
  **Summary:** Create quiz.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/quiz/submit/{id}"`

### `backend/src/main/java/com/exl/quizapp/controller/UserController.java`

**Language:** java

- **Method:** GET
  **Path:** `/api/user/profile`
  **Summary:** Retrieve api data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/api/user/profile"`
- **Method:** GET
  **Path:** `/api/user/qr-code`
  **Summary:** Retrieve api data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/api/user/qr-code"`
- **Method:** GET
  **Path:** `/hello`
  **Summary:** Retrieve hello data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/hello"`
- **Method:** POST
  **Path:** `/login`
  **Summary:** Create login.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/login"`
- **Method:** POST
  **Path:** `/register`
  **Summary:** Create register.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/register"`
- **Method:** POST
  **Path:** `/verify-otp`
  **Summary:** Create verify otp.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/verify-otp"`

---

## All Endpoints

- `DELETE /question/delete/{id}`
- `GET /api/user/profile`
- `GET /api/user/qr-code`
- `GET /hello`
- `GET /question/category/{category}`
- `GET /question/my-questions`
- `GET /quiz/all`
- `GET /quiz/code/{code}`
- `GET /quiz/get/{id}`
- `GET /quiz/my-quizzes`
- `GET /quiz/result/{id}`
- `POST /ai/generate`
- `POST /login`
- `POST /question/add`
- `POST /question/add-batch`
- `POST /quiz/create`
- `POST /quiz/submit/{id}`
- `POST /register`
- `POST /verify-otp`
- `PUT /question/update/{id}`

---

## Notes

- This documentation was generated from detected endpoint patterns with inferred metadata
- LLM enrichment was enabled where available using local RAG context
- Review source controllers/routes for exact auth and payload schemas
- For detailed implementation, refer to the source files
