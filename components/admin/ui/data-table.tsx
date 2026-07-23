"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, TableSkeleton, EmptyState, ErrorState } from "./primitives";
import { TRANSITION } from "./tokens";

export interface Column<T> {
  /** Stable key. If `sortable`, this is sent to the API as `sortBy`. */
  key: string;
  header: string;
  /** Renders the cell. Kept as a function so columns own their own markup. */
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  /** Hide below `lg` — lets dense tables stay readable on tablets. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  emptyTitle?: string;
  emptyDescription?: string;

  /** Server-side sort state. */
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;

  /** Server-side pagination. */
  page?: number;
  totalPages?: number;
  totalRecords?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;

  /** Row selection + bulk actions. Omit `onSelectionChange` to disable. */
  selected?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: React.ReactNode;

  onRowClick?: (row: T) => void;
}

const HIDE_CLASS: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
};

const PAGE_SIZES = [10, 25, 50, 100];

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  sortBy,
  sortOrder,
  onSort,
  page = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  selected = [],
  onSelectionChange,
  bulkActions,
  onRowClick,
}: DataTableProps<T>) {
  const selectable = Boolean(onSelectionChange);
  const ids = React.useMemo(() => rows.map(rowKey), [rows, rowKey]);

  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
  const someSelected = selected.length > 0 && !allSelected;

  // Indeterminate is a DOM property, not an attribute — React can't set it in JSX.
  const headerCheckbox = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (headerCheckbox.current) headerCheckbox.current.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? [] : ids);
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  };

  const colCount = columns.length + (selectable ? 1 : 0);

  const from = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalRecords);

  return (
    <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm flex flex-col min-h-[480px]">
      {/* Bulk action bar — replaces the header row's meaning while active */}
      {selectable && selected.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 bg-purple-50/60 px-4 py-2.5">
          <span className="text-xs font-semibold text-[#5B2C83]">
            {selected.length} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions}
            <Button variant="ghost" size="sm" onClick={() => onSelectionChange?.([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto flex-1">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
            <tr className="border-b border-[#E5E7EB]">
              {selectable && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    ref={headerCheckbox}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all rows on this page"
                    className="size-3.5 cursor-pointer rounded border-gray-300 accent-[#5B2C83]"
                  />
                </th>
              )}
              {columns.map((col) => {
                const active = sortBy === col.key;
                const SortIcon = !active ? ChevronsUpDown : sortOrder === "asc" ? ChevronUp : ChevronDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]",
                      col.hideBelow && HIDE_CLASS[col.hideBelow],
                      col.className
                    )}
                  >
                    {col.sortable && onSort ? (
                      <button
                        onClick={() => onSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded hover:text-[#111827]",
                          active && "text-[#5B2C83]",
                          TRANSITION
                        )}
                      >
                        {col.header}
                        <SortIcon className="size-3" />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {!loading && !error && rows.length > 0 && (
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const id = rowKey(row);
                const isSelected = selected.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "group",
                      TRANSITION,
                      isSelected ? "bg-purple-50/40" : "hover:bg-gray-50/70",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(id)}
                          aria-label={`Select row ${id}`}
                          className="size-3.5 cursor-pointer rounded border-gray-300 accent-[#5B2C83]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3 align-middle text-xs text-[#111827]",
                          col.hideBelow && HIDE_CLASS[col.hideBelow],
                          col.className
                        )}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      {loading && <TableSkeleton rows={pageSize > 10 ? 8 : 5} cols={colCount} />}
      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}
      {!loading && !error && rows.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}

      {/* Pagination */}
      {!loading && !error && totalRecords > 0 && onPageChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] px-4 py-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-[#6B7280]">
              <span className="font-semibold text-[#111827]">{from}–{to}</span> of{" "}
              <span className="font-semibold text-[#111827]">{totalRecords}</span>
            </p>
            {onPageSizeChange && (
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                aria-label="Rows per page"
                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#5B2C83]/20"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} / page
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="h-8 text-xs font-bold rounded-lg"
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </Button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-xs text-gray-400 font-bold">…</span>}
                    <button
                      onClick={() => onPageChange(p)}
                      className={cn(
                        "size-7 rounded-lg text-xs font-bold transition-all",
                        p === page
                          ? "bg-[#5B2C83] text-white shadow-2xs"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                      )}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="h-8 text-xs font-bold rounded-lg"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
