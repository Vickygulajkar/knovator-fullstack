import Link from "next/link";
import JobCard from "../../components/JobCard";
import Pagination from "../../components/Pagination";
import { getImportById, getJobsByImportId } from "../../services/api";

type ImportPageProps = {
  params: Promise<{ importId: string }>;
  searchParams?: Promise<{ page?: string }>;
};

export default async function ImportPage({
  params,
  searchParams,
}: ImportPageProps) {
  const { importId } = await params;
  const sp = (await searchParams) ?? {};
  const page = Number(sp.page ?? 1);

  const importData = await getImportById(importId);

  if (!importData) {
    return <div className="p-6">❌ Import not found</div>;
  }

  const jobData = await getJobsByImportId(importId, page, 10);

  // Ensure importId is captured for pagination
  const paginationHref = (pageNum: number) => `/imports/${importId}?page=${pageNum}`;

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href="/"
          className="text-sm text-blue-600 underline hover:text-blue-800"
        >
          ← Back to Home
        </Link>
      </div>
      <h1 className="text-xl font-bold mb-2">Import: {importId}</h1>

      <p className="mb-4 text-sm text-gray-700">
        Status: <b>{importData.status}</b> | Total Jobs:{" "}
        <b>{importData.totalJobs}</b> | Processed:{" "}
        <b>{importData.processedJobs}</b> | Failed:{" "}
        <b>{importData.failedJobs}</b>
      </p>

      <div className="grid gap-4">
        {jobData.jobs.map((job: any) => (
          <JobCard key={job._id} job={job} />
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={jobData.totalPages}
        makeHref={paginationHref}
      />
    </main>
  );
}


