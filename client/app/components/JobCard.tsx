export type Job = {
  _id: string;
  title: string;
  source?: string;
  description?: string;
  link: string;
};

export default function JobCard({ job }: { job: Job }) {
  const preview =
    job.description && job.description.length > 150
      ? `${job.description.slice(0, 150)}...`
      : job.description ?? "";

  return (
    <div className="border border-gray-200 p-4 rounded-md bg-white shadow-sm">
      <h3 className="font-semibold text-lg mb-1">{job.title}</h3>
      {job.source && (
        <p className="text-xs text-gray-500 mb-2">Source: {job.source}</p>
      )}
      {preview && (
        <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">
          {preview}
        </p>
      )}

      <a
        href={job.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 underline"
      >
        View Job
      </a>
    </div>
  );
}


