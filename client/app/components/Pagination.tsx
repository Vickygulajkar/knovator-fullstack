import Link from "next/link";

export default function Pagination({
  currentPage,
  totalPages,
  makeHref,
}: {
  currentPage: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-4 mt-6 text-sm">
      {currentPage > 1 && (
        <Link
          className="underline text-blue-600"
          href={makeHref(currentPage - 1)}
        >
          Prev
        </Link>
      )}

      <span>
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages && (
        <Link
          className="underline text-blue-600"
          href={makeHref(currentPage + 1)}
        >
          Next
        </Link>
      )}
    </div>
  );
}


