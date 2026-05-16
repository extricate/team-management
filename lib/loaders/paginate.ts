export interface PageResult<T> {
  rows: T[];
  total: number;
  totalPages: number;
  currentPage: number;
  from: number;
  to: number;
}

// Centralises the count → clamp → fetch pipeline so list pages only declare
// *what* to filter and sort, not *how* to paginate.
export async function paginate<T>(opts: {
  count: () => Promise<number>;
  fetch: (limit: number, offset: number) => Promise<T[]>;
  page: number;
  pageSize: number;
}): Promise<PageResult<T>> {
  const total = await opts.count();
  const totalPages = Math.ceil(total / opts.pageSize);
  const currentPage = Math.min(opts.page, Math.max(1, totalPages));
  const offset = (currentPage - 1) * opts.pageSize;
  const rows = await opts.fetch(opts.pageSize, offset);
  const from = total > 0 ? offset + 1 : 0;
  const to = Math.min(offset + opts.pageSize, total);
  return { rows, total, totalPages, currentPage, from, to };
}
