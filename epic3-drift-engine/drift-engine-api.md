# Drift Engine API Documentation

## Overview
The Drift Engine API is deployed at [https://drift-engine.onrender.com](https://drift-engine.onrender.com). It provides endpoints for analyzing, reporting, and tracking drift in documentation, APIs, and schemas.

---

## Base URL
```
https://drift-engine.onrender.com
```

---

## Endpoints

### 1. Health Check
- **GET** `/`
- **Description:** Returns API status and version.

### 2. Drift Analysis
- **POST** `/drift/analyze`
- **Description:** Analyze drift between documentation snapshots or API schemas.
- **Request Body:**
  - `doc_snapshot`: JSON object representing the current documentation snapshot.
  - `reference_snapshot`: JSON object representing the reference documentation or schema.
- **Response:**
  - Drift report with severity, impacted symbols, and summary.

### 3. Impact Report
- **POST** `/drift/impact`
- **Description:** Generate an impact report based on detected drift.
- **Request Body:**
  - `drift_report`: JSON object from the drift analysis.
- **Response:**
  - Impact report with affected areas and recommendations.

### 4. Documentation Index
- **GET** `/docs/index`
- **Description:** List indexed documentation files and their metadata.

### 5. API Schema Index
- **GET** `/api/index`
- **Description:** List indexed API schemas and their metadata.

---

## Example Usage

### Drift Analysis Example
```bash
curl -X POST https://drift-engine.onrender.com/drift/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "doc_snapshot": { ... },
    "reference_snapshot": { ... }
  }'
```

### Health Check Example
```bash
curl https://drift-engine.onrender.com/
```

---

## Deployment
- The API is deployed on [Render](https://render.com).
- Docker-based deployment (see `Dockerfile` and `docker-compose.yml`).
- For local development, run `main.py` or use `run_drift.py`.

---

## Contact & Support
For issues or feature requests, please open an issue in the repository or contact the maintainer.

---

## License
This project is licensed under the MIT License.
