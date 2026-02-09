# API Reference

**Total Endpoints:** 8

---

## Endpoints by File

### `Back/middleware/csrfMiddleware.js`

**Language:** javascript

- **Method:** GET
  **Path:** `/api/csrf-token`
  **Summary:** Retrieve api data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/api/csrf-token"`

### `Back/routes/addressRoutes.js`

**Language:** javascript

- **Method:** DELETE
  **Path:** `/:id`
  **Summary:** Delete :id.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X DELETE "<base-url>/:id"`
- **Method:** GET
  **Path:** `/`
  **Summary:** Retrieve resource data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/"`
- **Method:** PATCH
  **Path:** `/:id/default`
  **Summary:** Partially update :id.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/:id/default"`
- **Method:** POST
  **Path:** `/`
  **Summary:** Create resource.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/"`
- **Method:** PUT
  **Path:** `/:id`
  **Summary:** Update :id.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X PUT "<base-url>/:id"`

### `Back/routes/creatorApplicationRoutes.js`

**Language:** javascript

- **Method:** GET
  **Path:** `/`
  **Summary:** Retrieve resource data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/"`
- **Method:** PATCH
  **Path:** `/:id/status`
  **Summary:** Partially update :id.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: id
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X PATCH "<base-url>/:id/status"`
- **Method:** POST
  **Path:** `/submit`
  **Summary:** Create submit.
  **Authentication:** Likely requires authentication/authorization middleware
  **Parameters:** Path params: none detected
  **Responses:** 201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error
  **Examples:** `curl -X POST "<base-url>/submit"`

### `Back/server.js`

**Language:** javascript

- **Method:** GET
  **Path:** `/`
  **Summary:** Retrieve resource data.
  **Authentication:** Public endpoint (authentication may not be required)
  **Parameters:** Path params: none detected
  **Responses:** 200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error
  **Examples:** `curl -X GET "<base-url>/"`

---

## All Endpoints

- `DELETE /:id`
- `GET /`
- `GET /api/csrf-token`
- `PATCH /:id/default`
- `PATCH /:id/status`
- `POST /`
- `POST /submit`
- `PUT /:id`

---

## Notes

- This documentation was generated from detected endpoint patterns with inferred metadata
- LLM enrichment was enabled where available using local RAG context
- Review source controllers/routes for exact auth and payload schemas
- For detailed implementation, refer to the source files
