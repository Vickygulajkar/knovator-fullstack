import Link from "next/link";
import ImportHistoryTable from "./components/ImportHistoryTable";
import Pagination from "./components/Pagination";
import { getImportLogs } from "./services/api";

type HomePageProps = {
  searchParams?: Promise<{ page?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const sp = (await searchParams) ?? {};
  const page = Number(sp.page ?? 1);
  const { logs, totalPages } = await getImportLogs(page, 10);

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Job Import Dashboard</h1>
          <p className="text-sm text-gray-600">
            View import history and drill down into individual runs.
          </p>
        </div>
        <Link
          href="/imports"
          className="text-sm text-blue-600 underline font-medium"
        >
          View full history
        </Link>
      </header>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Imports</h2>
        <ImportHistoryTable logs={logs} />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          makeHref={(p) => `/?page=${p}`}
        />
      </section>
    </main>
  );
}
