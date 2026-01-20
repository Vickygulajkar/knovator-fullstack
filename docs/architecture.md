## Architecture – Scalable Job Importer

This document explains the **system design**, **data flow**, **key decisions**, and **scalability considerations** for the Job Importer application.

---

## 1. High-Level Overview

The system periodically imports jobs from multiple external XML feeds (e.g. [`https://jobicy.com/?feed=job_feed`](https://jobicy.com/?feed=job_feed), [`https://www.higheredjobs.com/rss/articleFeed.cfm`](https://www.higheredjobs.com/rss/articleFeed.cfm)), normalizes them, and stores them in MongoDB. Imports are executed using **Redis-backed BullMQ queues** with **worker processes**, and each import run is logged into `import_logs`. An **Admin UI** built with Next.js provides visibility into import history and statistics.

At a high level, the architecture follows this flow:

1. **Scheduler** (cron or BullMQ repeatable job) triggers an import for each configured job feed.
2. **Import Service** calls the external feed (XML), converts it to JSON, and enqueues individual job processing tasks into a Redis-backed **BullMQ queue**.
3. **Worker processes** consume jobs from the queue, normalize and validate data, then **upsert** into MongoDB’s `jobs` collection.
4. For each import run, **Import Logger** creates/updates an `import_logs` record with metrics: `totalFetched`, `totalImported`, `newJobs`, `updatedJobs`, `failedJobs`, and failure reasons.
5. **Admin API** serves paginated import history to the **Next.js Admin UI**, which renders the import tracking screen.

This separation allows the system to **scale horizontally** (multiple workers and API instances) and eventually evolve into a **microservices** architecture if needed.

---

## 2. Repository Structure

```txt
/client                 # Next.js admin UI (TypeScript)
/server                 # Express API + job scheduler + worker
  /src
    /config             # env and configuration
    /models             # Mongoose models (Job, ImportLog)
    /services           # domain services (import, job, history, XML parsing)
    /queues             # BullMQ queue and worker setup
    /routes             # Express routes
    /workers            # Worker entrypoint
    /utils              # shared utilities (logging, error helpers)
docs/
  architecture.md       # This document
README.md               # Setup and usage
```

---

## 3. Backend Architecture

### 3.1 Components

- **Express API**
  - Routes for:
    - `/api/imports/run` – manual trigger for imports.
    - `/api/imports` – list import history with filters & pagination.
    - `/api/imports/:id` – view details for a specific import run (including failures).
  - CORS configured to allow the Next.js client.

- **Scheduler**
  - Uses `node-cron` or **BullMQ repeatable jobs**.
  - Reads `JOB_FEED_URLS` from configuration and schedules import jobs.
  - For each run:
    - Creates an `import_logs` entry in MongoDB per feed.
    - Pushes job batches into the `job-import-queue`.

- **Import Service**
  - Fetches XML from configured URLs.
  - Converts XML to JSON using `fast-xml-parser`.
  - Normalizes feed-specific structures into a common `Job` DTO.
  - Batches jobs (size configurable via `JOB_BATCH_SIZE`) and enqueues them for workers.

- **Queue / BullMQ**
  - `job-import-queue` using Redis.
  - Per-job payload includes:
    - `importLogId`
    - normalized job data
    - source/feed metadata
  - Configurable **concurrency** using `JOB_QUEUE_CONCURRENCY`.
  - **Retry strategy**:
    - Limited attempts (e.g. 3).
    - Exponential backoff (e.g. 2^n seconds).

- **Worker**
  - Runs in a separate process for scalability.
  - Subscribes to `job-import-queue`.
  - For each job:
    1. Validate and normalize data.
    2. Upsert into `jobs` collection (see Matching Logic below).
    3. Update counts in `import_logs`:
       - Increment `newJobs`, `updatedJobs`, or `failedJobs`.
       - Log failure details if any.

- **MongoDB**
  - `jobs` collection – holds normalized job postings.
  - `import_logs` collection – tracks import runs and statistics.

---

## 4. Data Model

### 4.1 Jobs Collection (`jobs`)

Key design goals:

- **Idempotency**: Multiple imports of the same job should not create duplicates.
- **Efficient updates**: Avoid full re-writes when no data has changed.
- **Source awareness**: A job is uniquely identified by its originating feed and external ID.

Conceptual schema:

- `source` – string (e.g. `jobicy`, `higheredjobs`).
- `externalId` – string (e.g., `guid` or `link` from RSS).
- `title` – string.
- `company` – string.
- `location` – string.
- `description` – string / HTML.
- `url` – string (original job posting URL).
- `employmentType` – string (e.g., `full-time`).
- `category` – string.
- `publishedAt` – date.
- `updatedAt` – date.
- `raw` – object (optional raw payload for debugging).

Indexes:

- **Unique compound index** on `{ source: 1, externalId: 1 }`.
- Secondary indexes on fields that may be queried (e.g., `category`, `company`).

### 4.2 Import Logs Collection (`import_logs`)

Each document represents a **single import run for a given feed**.

Fields:

- `fileName` – string (for UI: the feed URL).
- `inputType` – string (e.g. `jp1`, `jp2 (insert)`) mapped from feed configuration.
- `importId` – string (internal logical ID, e.g. UUID or derived from BullMQ job id).
- `importDateTime` – Date (time the import run was started or completed).
- `totalFetched` – number (jobs fetched from the external API).
- `totalImported` – number (jobs successfully processed by workers).
- `newJobs` – number.
- `updatedJobs` – number.
- `failedJobs` – number.
- `failedReasons` – array of objects (e.g. `{ externalId, reason }`) or aggregated strings.
- `status` – enum: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`.

Indexes:

- Index on `importDateTime` (for sorting).
- Index on `inputType` (for filtering).
- Optionally index on `fileName`.

---

## 5. Matching & Upsert Logic

To avoid duplicates and correctly classify jobs as **new** or **updated**, the system applies this logic:

1. Determine **natural key**:
   - `(source, externalId)` where:
     - `source` is derived from feed configuration (`jobicy`, `higheredjobs`, etc.).
     - `externalId` is typically `guid` or a unique identifier from the feed (if not available, fall back to job `link` URL).

2. Workflow per job in the worker:
   - Perform `findOne({ source, externalId })`.
   - If not found:
     - Insert new job document.
     - Increment `newJobs` in `import_logs`.
   - If found:
     - Compare relevant fields (e.g., `title`, `description`, `location`, `employmentType`).
     - If there are **material changes**, update the document and increment `updatedJobs`.
     - If no changes, you may:
       - Skip updating (optimization).
       - Still consider as part of `totalFetched`, but not `totalImported`.
   - On any error (validation, DB errors):
     - Increment `failedJobs`.
     - Append a `failedReasons` entry.

This is implemented using an **atomic upsert** operation (e.g., `findOneAndUpdate` with `upsert: true`) combined with logic to determine whether the record was newly created vs updated.

---

## 6. Queue & Worker Design

### 6.1 Queue

- Technology: **BullMQ** (backed by Redis).
- Queue name: `job-import-queue` (configurable).
- Job payload:
  - `importLogId` (string / ObjectId) – reference to `import_logs` document.
  - `job` – normalized job data DTO.
  - `meta` – additional info (e.g., batchId, source, feedUrl).

### 6.2 Worker Concurrency & Retry

- **Concurrency**:
  - Configurable via `JOB_QUEUE_CONCURRENCY`.
  - Allows scaling up throughput by processing multiple jobs simultaneously.
- **Retries**:
  - Each job has a limited number of retries (e.g., 3).
  - Exponential backoff (e.g., 2s, 4s, 8s) to avoid hammering external services or DB.
- **Failure Handling**:
  - Permanent failures are recorded in `failedReasons`.
  - Import log `status` is set to `FAILED` if failures exceed a threshold, or remains `COMPLETED` with non-zero `failedJobs` depending on policy.

### 6.3 Scaling

- Multiple worker processes (or containers) can listen to the same Redis queue to **scale horizontally**.
- API and workers are stateless; all coordination is via:
  - Redis (jobs, retries).
  - MongoDB (job data, import logs).

---

## 7. Scheduling & Cron

Two possible implementations (either can be used, and the project can be configured accordingly):

1. **node-cron** inside the API process:
   - Cron expression from `IMPORT_CRON_EXPRESSION`.
   - For each tick:
     - For each configured feed in `JOB_FEED_URLS`:
       - Create a new `import_logs` entry.
       - Fetch and enqueue jobs.

2. **BullMQ repeatable jobs**:
   - Define a repeatable job for each feed with given frequency.
   - BullMQ manages scheduling within Redis.
   - Pros: More centralized and observable scheduling with Bull/BullMQ tools.

Both approaches keep actual **job processing** in the worker, making the scheduler lightweight.

---

## 8. Frontend (Admin UI) Architecture

### 8.1 Tech Choices

- **Next.js** for:
  - Modern React-based Admin UI.
  - Fast development and easy deployment to Vercel (optional).
- **TypeScript** to catch errors at compile-time.
- **Tailwind CSS** or similar for quick, responsive layouts.

### 8.2 Screens

- **Import History Page**
  - Calls `/api/imports` with query params:
    - `page`, `pageSize`.
    - `inputType`, `fileName`, `fromDate`, `toDate`.
  - Renders a table with columns:

    | fileName | importDateTime | inputType | importId | total | new | updated | failed |

  - UI is modeled after the sample in the assignment.

- **Import Detail / Drawer (optional)**
  - Shows detailed data from `/api/imports/:id`:
    - Breakdown of failures (`failedReasons`).
    - Possibly a sample of new/updated jobs.

- **Real-time Updates (Bonus)**
  - Use **Socket.IO** or **Server-Sent Events (SSE)** to:
    - Receive updates when a given import run’s status or counters change.
    - Optimistically update the row in the history table without manual refresh.

---

## 9. Error Handling & Observability

- **Error Handling**
  - Centralized Express error middleware for API errors.
  - Worker try/catch for job processing with clear error messages stored in `failedReasons`.
  - Validation failures (missing `externalId`, malformed data) treated as **failed jobs**.

- **Logging**
  - Structured logging (e.g. JSON logs) for:
    - Import start/end.
    - Queue enqueue statistics.
    - Worker successes/failures.

- **Metrics (Future Improvement)**
  - Integrate with monitoring tools (Prometheus, Grafana, or 3rd-party APM).
  - Track queue depth, processing rate, error rates.

---

## 10. Scalability & Performance Considerations

- **Large Volume Handling (1M+ records)**
  - Queue-based architecture ensures imports are **asynchronous** and can be scaled by adding more workers.
  - Batch processing reduces overhead of job creation.
  - MongoDB indexes on `(source, externalId)` for efficient upserts.
  - Optionally use MongoDB bulk operations (`bulkWrite`) inside worker batches.

- **Horizontal Scaling**
  - Add more **workers** to increase throughput.
  - Run multiple **API instances** behind a load balancer; they only enqueue, not process.
  - Redis manages job distribution; MongoDB handles concurrent writes via upserts.

- **Backpressure**
  - Worker concurrency and rate limiting can be tuned to prevent overwhelming MongoDB.
  - Import scheduling can be adjusted (e.g., staggered imports for multiple feeds).

---

## 11. Security Considerations (High Level)

- Environment variables should be injected securely in production (no secrets in code).
- Admin API should be protected behind authentication/authorization in a real deployment (e.g., JWT-based auth).
- Validate and sanitize any data rendered in HTML (job descriptions) to avoid XSS.

---

## 12. Deployment Strategy

- **Recommended Stack**
  - **Frontend**: Deploy to Vercel (Next.js native).
  - **Backend**: Deploy to Render/Heroku/Fly.io or any Node-compatible platform.
  - **MongoDB**: MongoDB Atlas cluster.
  - **Redis**: Redis Cloud (e.g., Upstash, Redis Labs).

- **Environment Configuration**
  - Separate `.env` values for `development`, `staging`, and `production`.
  - Ensure all services (API, workers) use the same Redis and MongoDB endpoints.

- **CI/CD (Optional)**
  - Lint & test on pull requests.
  - Auto-deploy to staging on merge to main branch.

---

## 13. Assumptions & Trade-offs

- The job feeds listed in the assignment are **stable and publicly accessible**.
- Some fields may not exist across all feeds; the normalization step uses a **best-effort mapping** and defaults.
- The system favors **eventual consistency**:
  - Import logs may be briefly out of date while workers are still processing.
  - Real-time updates (bonus) mitigate the UX impact.
- For simplicity, only one `jobs` collection is used instead of per-source collections; this keeps queries unified at the cost of slightly more complex normalization logic.

---

## 14. How This Design Meets the Requirements

- **System design thinking**
  - Clear separation of concerns: API, scheduler, queue, workers, DB, and UI.
  - Uses patterns that can naturally evolve into microservices (separate worker service, import/scheduler service, admin service).

- **Queue processing & retry**
  - Redis + BullMQ with concurrency and exponential backoff.
  - Status and statistics stored in MongoDB and visible in the UI.

- **MongoDB design & upsert logic**
  - Unique `(source, externalId)` key to prevent duplicates.
  - Idempotent upsert for new vs updated jobs.
  - Efficient indexes for large volumes.

- **Import history**
  - Dedicated `import_logs` collection with fields matching the sample screen.
  - Filters and pagination implemented via backend API and surfaced in the Next.js UI.

- **Documentation & communication**
  - This `architecture.md` plus `README.md` explain setup, design decisions, and how to extend the system.


