import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export interface FilterParams {
  people: number[];
  year: number | null;
  month: number | null;
  q: string;
}

export function useFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const people: number[] = (searchParams.get("people") ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));

  const year = searchParams.get("year") ? Number(searchParams.get("year")) : null;
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : null;
  const q = searchParams.get("q") ?? "";

  const activeCount = (people.length > 0 ? 1 : 0) + (year ? 1 : 0) + (month ? 1 : 0) + (q ? 1 : 0);

  const setFilter = useCallback(
    (updates: Partial<FilterParams>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (updates.people !== undefined) {
            if (updates.people.length > 0) next.set("people", updates.people.join(","));
            else next.delete("people");
          }
          if (updates.year !== undefined) {
            if (updates.year) next.set("year", String(updates.year));
            else next.delete("year");
          }
          if (updates.month !== undefined) {
            if (updates.month) next.set("month", String(updates.month));
            else next.delete("month");
          }
          if (updates.q !== undefined) {
            if (updates.q) next.set("q", updates.q);
            else next.delete("q");
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("people");
        next.delete("year");
        next.delete("month");
        next.delete("q");
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  return { people, year, month, q, activeCount, setFilter, clearFilters };
}
