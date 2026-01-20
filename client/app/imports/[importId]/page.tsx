import JobCard from "../../components/JobCard";
import Pagination from "../../components/Pagination";
import { getImportById, getJobsByImportId } from "../../services/api";

type ImportPageProps = {
  params: { importId: string };
  searchParams?: { page?: string };
};

export default async function ImportPage({
  params,
  searchParams,
}: ImportPageProps) {
  const page = Number(searchParams?.page ?? 1);
  const importData = await getImportById(params.importId);

  if (!importData) {
    return <div className="p-6">❌ Import not found</div>;
  }

  const jobData = await getJobsByImportId(params.importId, page, 10);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-2">Import: {params.importId}</h1>

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
        makeHref={(p) => `/imports/${params.importId}?page=${p}`}
      />
    </main>
  );
}


