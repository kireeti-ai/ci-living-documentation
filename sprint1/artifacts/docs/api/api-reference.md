# API Reference

**Total Endpoints:** 46

---

## Endpoints by File

### `backend/src/app.js`

**Language:** javascript

- **Method:** GET
  **Path:** `/api/docs.json`
  **Summary:** Retrieve api data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/api/docs.json"`
- **Method:** GET
  **Path:** `/health`
  **Summary:** Retrieve health data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/health"`

### `backend/src/modules/activity/routes/activity.routes.js`

**Language:** javascript

- **Method:** GET
  **Path:** `/me`
  **Summary:** Retrieve me data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/me"`
- **Method:** GET
  **Path:** `/project/{projectId}`
  **Summary:** Retrieve project data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: projectId
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/project/{projectId}"`
- **Method:** GET
  **Path:** `/user/{userId}`
  **Summary:** Retrieve user data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: userId
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/user/{userId}"`

### `backend/src/modules/auth/routes/auth.routes.js`

**Language:** javascript

- **Method:** GET
  **Path:** `/me`
  **Summary:** Retrieve me data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/me"`
- **Method:** POST
  **Path:** `/change-password`
  **Summary:** Create change password.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/change-password"`
- **Method:** POST
  **Path:** `/login`
  **Summary:** Create login.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/login"`
- **Method:** POST
  **Path:** `/logout`
  **Summary:** Create logout.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/logout"`
- **Method:** POST
  **Path:** `/refresh`
  **Summary:** Create refresh.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/refresh"`
- **Method:** POST
  **Path:** `/register`
  **Summary:** Create register.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/register"`

### `backend/src/modules/comments/routes/comment.routes.js`

**Language:** javascript

- **Method:** DELETE
  **Path:** `/{id}`
  **Summary:** Delete {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X DELETE "<base-url>/{id}"`
- **Method:** DELETE
  **Path:** `/{id}/reactions/{emoji}`
  **Summary:** Delete {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id, emoji
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X DELETE "<base-url>/{id}/reactions/{emoji}"`
- **Method:** GET
  **Path:** `/`
  **Summary:** Retrieve resource data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/"`
- **Method:** PATCH
  **Path:** `/{id}`
  **Summary:** Partially update {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/{id}"`
- **Method:** POST
  **Path:** `/`
  **Summary:** Create resource.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/"`
- **Method:** POST
  **Path:** `/{id}/reactions`
  **Summary:** Create {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/{id}/reactions"`

### `backend/src/modules/labels/routes/label.routes.js`

**Language:** javascript

- **Method:** DELETE
  **Path:** `/{id}`
  **Summary:** Delete {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X DELETE "<base-url>/{id}"`
- **Method:** GET
  **Path:** `/`
  **Summary:** Retrieve resource data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/"`
- **Method:** GET
  **Path:** `/{id}`
  **Summary:** Retrieve {id} data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/{id}"`
- **Method:** PATCH
  **Path:** `/{id}`
  **Summary:** Partially update {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/{id}"`
- **Method:** POST
  **Path:** `/`
  **Summary:** Create resource.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/"`

### `backend/src/modules/projects/routes/project.routes.js`

**Language:** javascript

- **Method:** DELETE
  **Path:** `/{id}`
  **Summary:** Delete {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X DELETE "<base-url>/{id}"`
- **Method:** DELETE
  **Path:** `/{id}/members/{memberId}`
  **Summary:** Delete {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id, memberId
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X DELETE "<base-url>/{id}/members/{memberId}"`
- **Method:** GET
  **Path:** `/`
  **Summary:** Retrieve resource data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/"`
- **Method:** GET
  **Path:** `/analytics`
  **Summary:** Retrieve analytics data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/analytics"`
- **Method:** GET
  **Path:** `/{id}`
  **Summary:** Retrieve {id} data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/{id}"`
- **Method:** PATCH
  **Path:** `/{id}`
  **Summary:** Partially update {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/{id}"`
- **Method:** PATCH
  **Path:** `/{id}/members/{memberId}`
  **Summary:** Partially update {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id, memberId
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/{id}/members/{memberId}"`
- **Method:** POST
  **Path:** `/`
  **Summary:** Create resource.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/"`
- **Method:** POST
  **Path:** `/{id}/members`
  **Summary:** Create {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/{id}/members"`

### `backend/src/modules/tasks/routes/task.routes.js`

**Language:** javascript

- **Method:** DELETE
  **Path:** `/{id}`
  **Summary:** Delete {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X DELETE "<base-url>/{id}"`
- **Method:** GET
  **Path:** `/`
  **Summary:** Retrieve resource data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/"`
- **Method:** GET
  **Path:** `/board/{projectId}`
  **Summary:** Retrieve board data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: projectId
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/board/{projectId}"`
- **Method:** GET
  **Path:** `/my-tasks`
  **Summary:** Retrieve my tasks data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/my-tasks"`
- **Method:** GET
  **Path:** `/stats/{projectId}`
  **Summary:** Retrieve stats data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: projectId
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/stats/{projectId}"`
- **Method:** GET
  **Path:** `/{id}`
  **Summary:** Retrieve {id} data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/{id}"`
- **Method:** PATCH
  **Path:** `/bulk`
  **Summary:** Partially update bulk.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/bulk"`
- **Method:** PATCH
  **Path:** `/{id}`
  **Summary:** Partially update {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/{id}"`
- **Method:** POST
  **Path:** `/`
  **Summary:** Create resource.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/"`

### `backend/src/modules/users/routes/user.routes.js`

**Language:** javascript

- **Method:** DELETE
  **Path:** `/{id}`
  **Summary:** Delete {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X DELETE "<base-url>/{id}"`
- **Method:** GET
  **Path:** `/`
  **Summary:** Retrieve resource data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/"`
- **Method:** GET
  **Path:** `/statistics`
  **Summary:** Retrieve statistics data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/statistics"`
- **Method:** GET
  **Path:** `/{id}`
  **Summary:** Retrieve {id} data.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/{id}"`
- **Method:** PATCH
  **Path:** `/{id}`
  **Summary:** Partially update {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/{id}"`
- **Method:** PATCH
  **Path:** `/{id}/role`
  **Summary:** Partially update {id}.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/{id}/role"`

---

## All Endpoints

- `DELETE /{id}`
- `DELETE /{id}`
- `DELETE /{id}`
- `DELETE /{id}`
- `DELETE /{id}`
- `DELETE /{id}/members/{memberId}`
- `DELETE /{id}/reactions/{emoji}`
- `GET /`
- `GET /`
- `GET /`
- `GET /`
- `GET /`
- `GET /analytics`
- `GET /api/docs.json`
- `GET /board/{projectId}`
- `GET /health`
- `GET /me`
- `GET /me`
- `GET /my-tasks`
- `GET /project/{projectId}`
- `GET /statistics`
- `GET /stats/{projectId}`
- `GET /user/{userId}`
- `GET /{id}`
- `GET /{id}`
- `GET /{id}`
- `GET /{id}`
- `PATCH /bulk`
- `PATCH /{id}`
- `PATCH /{id}`
- `PATCH /{id}`
- `PATCH /{id}`
- `PATCH /{id}`
- `PATCH /{id}/members/{memberId}`
- `PATCH /{id}/role`
- `POST /`
- `POST /`
- `POST /`
- `POST /`
- `POST /change-password`
- `POST /login`
- `POST /logout`
- `POST /refresh`
- `POST /register`
- `POST /{id}/members`
- `POST /{id}/reactions`

---

## Notes

- This documentation was generated from detected endpoint patterns with inferred metadata
- LLM enrichment was enabled where available using local RAG context
- Review source controllers/routes for exact auth and payload schemas
- For detailed implementation, refer to the source files
