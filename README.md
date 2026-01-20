## Job Importer – Scalable Job Feed Ingestion (MERN + Redis + BullMQ)

This project implements a **scalable job import system** that:

- Fetches jobs from **external XML job feeds** (e.g. [`https://jobicy.com/?feed=job_feed`](https://jobicy.com/?feed=job_feed), [`https://www.higheredjobs.com/rss/articleFeed.cfm`](https://www.higheredjobs.com/rss/articleFeed.cfm)).
- Converts XML → JSON and **upserts** them into MongoDB.
- Uses **Redis + BullMQ** for background queue processing and retry handling.
- Tracks **import history** (total/new/updated/failed) in a dedicated `import_logs` collection.
- Exposes an **Admin UI (Next.js)** to trigger imports and view import history with filtering and pagination.

The repo is structured as:

```txt
/client          # Frontend app (Next.js admin UI)
/server          # Backend app (Node.js Express API + worker + queue)
/README.md       # Setup, usage, and how to run tests
/docs/architecture.md  # System design explanation, decisions made
```

---

## 1. Features

- **Job Source Integration**
  - Periodic fetch of multiple XML feeds:
    - [`https://jobicy.com/?feed=job_feed`](https://jobicy.com/?feed=job_feed)
    - [`https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time`](https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time)
    - [`https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france`](https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france)
    - [`https://jobicy.com/?feed=job_feed&job_categories=design-multi-media`](https://jobicy.com/?feed=job_feed&job_categories=design-multi-media)
    - [`https://jobicy.com/?feed=job_feed&job_categories=data-science`](https://jobicy.com/?feed=job_feed&job_categories=data-science)
    - [`https://jobicy.com/?feed=job_feed&job_categories=copywriting`](https://jobicy.com/?feed=job_feed&job_categories=copywriting)
    - [`https://jobicy.com/?feed=job_feed&job_categories=business`](https://jobicy.com/?feed=job_feed&job_categories=business)
    - [`https://jobicy.com/?feed=job_feed&job_categories=management`](https://jobicy.com/?feed=job_feed&job_categories=management)
    - [`https://www.higheredjobs.com/rss/articleFeed.cfm`](https://www.higheredjobs.com/rss/articleFeed.cfm)
  - XML parsing to normalized JSON.
  - Environment‑configurable **cron interval** (default: every 1 hour).

- **Queue-Based Background Processing**
  - **BullMQ** queues backed by Redis.
  - Configurable **concurrency** per worker.
  - **Retry logic** with exponential backoff.
  - Failure tracking with reason messages.

- **MongoDB Design**
  - `jobs` collection with **idempotent upsert** based on `(source, externalId)` unique index.
  - `import_logs` collection for **per-run statistics**:
    - `totalFetched`, `totalImported`, `newJobs`, `updatedJobs`, `failedJobs`, `failedReasons[]`.

- **Admin UI (Next.js)**
  - Import history table with:
    - `fileName` (feed URL),
    - `importDateTime`,
    - `inputType` (e.g. `jp1`, `jp2 (insert)`),
    - `importId`,
    - `total`, `new`, `updated`, `failed`.
  - Filters (by date, input type, feed URL) and pagination.
  - Optional: **Real-time updates** using Server-Sent Events or Socket.IO.

---

## 2. Tech Stack

- **Frontend**
  - Next.js (React)
  - TypeScript
  - Tailwind CSS (or similar utility CSS)
  - Axios / Fetch for API calls

- **Backend**
  - Node.js (Express)
  - TypeScript
  - Mongoose (MongoDB ODM)
  - BullMQ (job queue)
  - Redis (queue store)
  - `node-cron` (or BullMQ repeatable jobs) for scheduling
  - `fast-xml-parser` for XML → JSON

---

## 3. Prerequisites

- **Node.js** >= 18
- **Yarn** or **npm**
- **MongoDB**
  - Local MongoDB instance OR MongoDB Atlas connection string.
- **Redis**
  - Local Redis server or a Redis Cloud instance.

Optional but recommended:

- **Docker** and **Docker Compose** for one-command local setup.

---

## 4. Environment Variables

Create a `.env` file under `/server` and `/client` as shown below (adjust values as needed).

### 4.1 Server `.env` (in `/server`)

```env
# App
PORT=4000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/job_importer

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Queue / Worker
JOB_QUEUE_NAME=job-import-queue
JOB_QUEUE_CONCURRENCY=5
JOB_BATCH_SIZE=100

# Cron (in cron format, default: every hour)
IMPORT_CRON_EXPRESSION=0 * * * *

# Job feed sources (comma-separated)
JOB_FEED_URLS=https://jobicy.com/?feed=job_feed,https://www.higheredjobs.com/rss/articleFeed.cfm

# CORS for Admin UI
CLIENT_ORIGIN=http://localhost:3000
```

### 4.2 Client `.env.local` (in `/client`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

---

## 5. Installation & Running Locally

### 5.1 Clone the Repository

```bash
git clone <your-repo-url>.git
cd <project-root>
```

### 5.2 Install Dependencies

#### Backend

```bash
cd server
npm install
# or
yarn
```

#### Frontend

```bash
cd ../client
npm install
# or
yarn
```

---

## 6. Running Services

### 6.1 Start MongoDB and Redis

- **Option A – Local**  
  Ensure `mongod` and `redis-server` are running on the ports defined in `.env`.

- **Option B – Docker Compose (if provided in repo)**

```bash
docker compose up -d
```

---

### 6.2 Start Backend (API + Scheduler)

From `/server`:

```bash
npm run dev
# or
yarn dev
```

This does:

- Starts Express API on `PORT` (default `4000`).
- Connects to MongoDB and Redis.
- Registers a **cron job** (or BullMQ repeatable job) to:
  - Fetch job feeds.
  - Enqueue import jobs into BullMQ.
  - Write an entry into `import_logs` per import run.

---

### 6.3 Start Worker

Worker can run in the same process or separately. For better scalability we run it as a separate process.

From `/server`:

```bash
npm run worker
# or
yarn worker
```

This process:

- Listens to `JOB_QUEUE_NAME` in Redis.
- Processes jobs with configured **concurrency**.
- Performs idempotent upsert into `jobs` collection.
- Updates the associated `import_logs` record for each success/failure.

---

### 6.4 Start Frontend (Next.js Admin UI)

From `/client`:

```bash
npm run dev
# or
yarn dev
```

Visit:

```text
http://localhost:3000
```

---

## 7. Usage

### 7.1 Automatic Imports (Cron)

- By default, the scheduler will trigger imports automatically based on `IMPORT_CRON_EXPRESSION` (every hour).
- Each run:
  - Fetches all configured feeds.
  - Pushes jobs into the queue.
  - Records a new `import_logs` document per feed with:
    - `fileName`: feed URL,
    - `inputType`: alias like `jp1`, `jp2 (insert)` – configurable mapping per feed,
    - `importId`: internal ID (e.g., BullMQ job id or generated UUID),
    - `importDateTime`: time of the import.

### 7.2 Manual Import (via API / UI)

- The Admin UI exposes a **“Run Import Now”** action (if implemented).
- Alternatively, call the API directly (example):

```bash
curl -X POST http://localhost:4000/api/imports/run \
  -H "Content-Type: application/json" \
  -d '{"feedUrl":"https://jobicy.com/?feed=job_feed"}'
```

---

## 8. Admin UI – Import History Screen

- Table columns:

  - `fileName` – the job feed URL.
  - `importDateTime` – when the import finished.
  - `inputType` – logical label for feed/source (e.g., `jp1`–`jp5`).
  - `importId` – internal tracking ID.
  - `total` – total number of jobs processed in this import.
  - `new` – how many were **inserted** as brand new records.
  - `updated` – how many were **updated** (existing jobs changed).
  - `failed` – how many failed (validation, DB errors, etc.).

- Features:
  - Pagination.
  - Filter by date range, `inputType`, and `fileName` (feed URL).
  - Row click or details drawer to view:
    - Failure reasons (for failed jobs).
    - Example job payload (for debugging).

---

## 9. Testing

> Note: Add/adjust tests according to the actual implementation.

### 9.1 Backend Tests

From `/server`:

```bash
npm test
# or
yarn test
```

- Unit tests for:
  - XML → JSON transformation.
  - Job normalization/mapping logic.
  - Upsert service (new vs update vs no-op).
- Integration tests for:
  - Import endpoint.
  - Worker processing (using in-memory MongoDB/Redis mocks if desired).

### 9.2 Frontend Tests

From `/client`:

```bash
npm test
# or
yarn test
```

- Tests for:
  - Import history table rendering.
  - Filtering, pagination logic.
  - API integration (mocked).

---

## 10. Assumptions

- The external feeds are **trusted** but may contain occasional malformed entries.
- There is a stable **unique identifier per job** (e.g., `guid`/`link` from RSS) used as `externalId`.
- For matching logic, a job is considered “the same” if:
  - `source` (feed identifier) and `externalId` match.
- The **schema for jobs** is normalized enough to handle all listed feeds with minor differences.
- For the exercise, **authentication is omitted** from the admin UI; in real systems, this would be protected.

---

## 11. Future Improvements

- Role-based admin authentication and audit logs.
- Full-text search and advanced filters on jobs.
- Historical diffing of job updates (versioning).
- Horizontal scaling of workers with Kubernetes or similar.
- Monitoring dashboards for queue depth and worker health.


