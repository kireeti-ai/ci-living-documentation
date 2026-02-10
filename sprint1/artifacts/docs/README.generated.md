# git_clone_1t3e32fi

## Auto-Generated Documentation

This documentation was automatically generated from the impact report and code changes.

This documentation summarizes the analyzed code changes and their impact. It provides repository metadata, a structured change inventory, and an impact summary to support review and release decisions.

**Generated:** 1970-01-01T00:00:00Z

---

## Repository Information

| Attribute | Value |
|-----------|-------|
| **Repository** | `git_clone_1t3e32fi` |
| **Branch** | `main` |
| **Commit** | `edb75298` |
| **Author** | `kireeti-ai` |
| **Severity** | `MAJOR` |
| **Breaking Changes** | Yes |

---

## Changed Files

**Total Files Changed:** 114

### By Language

- **Javascript**: 84 file(s)
- **Other/Unknown**: 30 file(s)

### File List

1. `Dockerfile`
2. `README.md`
3. `docker-compose.yml`
4. `package.json`
5. `backend/.env.example`
6. `backend/.eslintrc.js`
7. `backend/package.json`
8. `docs/ADR-001.md`
9. `docs/api-reference.md`
10. `docs/architecture.md`
11. `docs/changelog.md`
12. `docs/data-model.md`
13. `docs/security.md`
14. `docs/testing.md`
15. `frontend/Dockerfile.dev`
16. `frontend/index.html`
17. `frontend/package.json`
18. `frontend/vite.config.js`
19. `.github/workflows/ci.yml`
20. `backend/src/app.js`
21. `backend/src/server.js`
22. `backend/tests/setup.js`
23. `frontend/src/App.jsx`
24. `frontend/src/index.css`
25. `frontend/src/main.jsx`
26. `frontend/tests/setup.js`
27. `backend/src/config/database.js`
28. `backend/src/config/index.js`
29. `backend/src/docs/swagger.js`
30. `backend/src/middleware/auth.js`
31. `backend/src/middleware/errorHandler.js`
32. `backend/src/middleware/index.js`
33. `backend/src/middleware/rbac.js`
34. `backend/src/middleware/requestLogger.js`
35. `backend/src/middleware/validate.js`
36. `backend/src/routes/index.js`
37. `backend/src/scripts/seed.js`
38. `backend/src/utils/ApiError.js`
39. `backend/src/utils/ApiResponse.js`
40. `backend/src/utils/asyncHandler.js`
41. `backend/src/utils/index.js`
42. `backend/src/utils/jwt.js`
43. `backend/src/utils/logger.js`
44. `backend/tests/integration/auth.test.js`
45. `backend/tests/integration/projects.test.js`
46. `backend/tests/integration/tasks.test.js`
47. `frontend/src/context/AuthContext.jsx`
48. `frontend/src/pages/AdminPage.css`
49. `frontend/src/pages/AdminPage.jsx`
50. `frontend/src/pages/AuthPages.css`
51. `frontend/src/pages/DashboardPage.css`
52. `frontend/src/pages/DashboardPage.jsx`
53. `frontend/src/pages/LoginPage.jsx`
54. `frontend/src/pages/ProfilePage.css`
55. `frontend/src/pages/ProfilePage.jsx`
56. `frontend/src/pages/ProjectDetailPage.css`
57. `frontend/src/pages/ProjectDetailPage.jsx`
58. `frontend/src/pages/ProjectsPage.css`
59. `frontend/src/pages/ProjectsPage.jsx`
60. `frontend/src/pages/RegisterPage.jsx`
61. `frontend/src/pages/TasksPage.css`
62. `frontend/src/pages/TasksPage.jsx`
63. `frontend/src/services/api.js`
64. `frontend/src/services/authService.js`
65. `frontend/src/services/projectService.js`
66. `frontend/src/services/taskService.js`
67. `frontend/src/services/userService.js`
68. `backend/src/modules/activity/Activity.model.js`
69. `backend/src/modules/comments/Comment.model.js`
70. `backend/src/modules/labels/Label.model.js`
71. `backend/src/modules/projects/Project.model.js`
72. `backend/src/modules/tasks/Task.model.js`
73. `backend/src/modules/users/User.model.js`
74. `frontend/src/components/auth/ProtectedRoute.jsx`
75. `frontend/src/components/common/Avatar.css`
76. `frontend/src/components/common/Avatar.jsx`
77. `frontend/src/components/common/Layout.css`
78. `frontend/src/components/common/Layout.jsx`
79. `frontend/src/components/common/LoadingSpinner.css`
80. `frontend/src/components/common/LoadingSpinner.jsx`
81. `frontend/src/components/common/Navbar.css`
82. `frontend/src/components/common/Navbar.jsx`
83. `frontend/src/components/common/Sidebar.css`
84. `frontend/src/components/common/Sidebar.jsx`
85. `backend/src/modules/activity/controllers/activity.controller.js`
86. `backend/src/modules/activity/routes/activity.routes.js`
87. `backend/src/modules/activity/services/activity.service.js`
88. `backend/src/modules/auth/controllers/auth.controller.js`
89. `backend/src/modules/auth/routes/auth.routes.js`
90. `backend/src/modules/auth/services/auth.service.js`
91. `backend/src/modules/auth/validators/auth.validator.js`
92. `backend/src/modules/comments/controllers/comment.controller.js`
93. `backend/src/modules/comments/routes/comment.routes.js`
94. `backend/src/modules/comments/services/comment.service.js`
95. `backend/src/modules/comments/validators/comment.validator.js`
96. `backend/src/modules/labels/controllers/label.controller.js`
97. `backend/src/modules/labels/routes/label.routes.js`
98. `backend/src/modules/labels/services/label.service.js`
99. `backend/src/modules/labels/validators/label.validator.js`
100. `backend/src/modules/projects/controllers/project.controller.js`
101. `backend/src/modules/projects/repositories/project.repository.js`
102. `backend/src/modules/projects/routes/project.routes.js`
103. `backend/src/modules/projects/services/project.service.js`
104. `backend/src/modules/projects/validators/project.validator.js`
105. `backend/src/modules/tasks/controllers/task.controller.js`
106. `backend/src/modules/tasks/repositories/task.repository.js`
107. `backend/src/modules/tasks/routes/task.routes.js`
108. `backend/src/modules/tasks/services/task.service.js`
109. `backend/src/modules/tasks/validators/task.validator.js`
110. `backend/src/modules/users/controllers/user.controller.js`
111. `backend/src/modules/users/repositories/user.repository.js`
112. `backend/src/modules/users/routes/user.routes.js`
113. `backend/src/modules/users/services/user.service.js`
114. `backend/src/modules/users/validators/user.validator.js`

---

## Change Impact

**Severity Level:** `MAJOR`

**MAJOR** - Important changes that may affect multiple components.

**Breaking Changes:** Yes - Review carefully before deployment

Impact level is MAJOR. Breaking changes: Yes. Review high-risk files before deployment.

---

## Additional Documentation

- [API Reference](api/api-reference.md)
- [Architecture Decision Records](adr/ADR-001.md)
- [System Diagrams](architecture/)

---

## Installation

Not detected in the impact report.

## Usage

Not detected in the impact report.

## Features

Not detected in the impact report.

## Tech Stack

Not detected in the impact report.

## Configuration

Not detected in the impact report.

## Troubleshooting

Not detected in the impact report.

## Contributing

Not detected in the impact report.

## License

Not detected in the impact report.

---

## About This Document

This README was automatically generated by the EPIC-2 documentation pipeline based on the impact report.

For more information about the documentation system, see the [documentation snapshot](doc_snapshot.json).
