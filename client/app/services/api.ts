const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

const IMPORTS_BASE = `${API_BASE}/imports`;

export type ImportLog = {
  _id: string;
  importId: string;
  fileName: string;
  inputType: string;
  totalFetched: number;
  totalImported: number;
  newJobs: number;
  updatedJobs: number;
  failedJobs: number;
  failedReasons?: { jobId: string; reason: string }[];
  createdAt: string;
};

export async function getImportLogs(page = 1, limit = 10) {
  const res = await fetch(
    `${IMPORTS_BASE}/logs/history?page=${page}&limit=${limit}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch import logs");
  }

  return res.json() as Promise<{
    page: number;
    limit: number;
    totalLogs: number;
    totalPages: number;
    logs: ImportLog[];
  }>;
}

export async function getImportById(importId: string) {
  const res = await fetch(`${IMPORTS_BASE}/${importId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function getJobsByImportId(
  importId: string,
  page = 1,
  limit = 10
) {
  const res = await fetch(
    `${IMPORTS_BASE}/${importId}/jobs?page=${page}&limit=${limit}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch jobs for import");
  }

  return res.json();
}

export async function triggerImportRun(options?: {
  url?: string;
  inputType?: string;
}) {
  const res = await fetch(`${IMPORTS_BASE}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options ?? {}),
  });

  if (!res.ok) {
    throw new Error("Failed to start import run");
  }

  return res.json();
}
