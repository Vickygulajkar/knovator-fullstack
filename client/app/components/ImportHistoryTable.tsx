import Link from "next/link";
import type { ImportLog } from "../services/api";

export default function ImportHistoryTable({ logs }: { logs: ImportLog[] }) {
  if (!logs.length) {
    return <p>No imports found yet.</p>;
  }

  return (
    <table className="w-full border border-gray-200 text-sm">
      <thead>
        <tr className="bg-gray-100">
          <th className="border border-gray-200 p-2 text-left">fileName</th>
          <th className="border border-gray-200 p-2 text-left">
            importDateTime
          </th>
          <th className="border border-gray-200 p-2 text-left">inputType</th>
          <th className="border border-gray-200 p-2 text-left">importId</th>
          <th className="border border-gray-200 p-2 text-right">total</th>
          <th className="border border-gray-200 p-2 text-right">new</th>
          <th className="border border-gray-200 p-2 text-right">updated</th>
          <th className="border border-gray-200 p-2 text-right">failed</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log._id} className="hover:bg-gray-50">
            <td className="border border-gray-200 p-2 max-w-xs truncate">
              {log.fileName}
            </td>
            <td className="border border-gray-200 p-2">
              {new Date(log.createdAt).toLocaleString()}
            </td>
            <td className="border border-gray-200 p-2">{log.inputType}</td>
            <td className="border border-gray-200 p-2">
              {log.importId ? (
                <Link
                  href={`/imports/${log.importId}`}
                  className="text-blue-600 underline"
                >
                  {log.importId}
                </Link>
              ) : (
                "-"
              )}
            </td>
            <td className="border border-gray-200 p-2 text-right">
              {log.totalImported}
            </td>
            <td className="border border-gray-200 p-2 text-right">
              {log.newJobs}
            </td>
            <td className="border border-gray-200 p-2 text-right">
              {log.updatedJobs}
            </td>
            <td className="border border-gray-200 p-2 text-right">
              {log.failedJobs}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


