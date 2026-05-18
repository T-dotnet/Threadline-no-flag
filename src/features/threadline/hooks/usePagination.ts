import { useState } from 'react';

export function usePagination<T>(items: T[], initialRpp = 10) {
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(initialRpp);
  const total = Math.ceil(items.length / rpp);
  const pagedItems = items.slice(page * rpp, (page + 1) * rpp);
  const s = items.length === 0 ? 0 : page * rpp + 1;
  const e = Math.min((page + 1) * rpp, items.length);
  return { page, setPage, rpp, setRpp, pagedItems, total, s, e };
}
