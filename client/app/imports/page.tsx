import Link from "next/link";
import ImportHistoryTable from "../components/ImportHistoryTable";
import Pagination from "../components/Pagination";
import { getImportLogs } from "../services/api";

type ImportsPageProps = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  const sp = (await searchParams) ?? {};
  const page = Number(sp.page ?? 1);
  const { logs, totalPages } = await getImportLogs(page, 10);

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Import History</h1>
        <Link className="text-sm text-blue-600 underline" href="/">
          Home
        </Link>
      </div>

      <ImportHistoryTable logs={logs} />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        makeHref={(p) => `/imports?page=${p}`}
      />
    </main>
  );
}


