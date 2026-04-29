import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ page, totalPages, total, limit, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const from = total && limit ? (page - 1) * limit + 1 : null;
  const to = total && limit ? Math.min(page * limit, total) : null;

  return (
    <div className="flex items-center justify-between pt-4 border-t">
      {total && from && to ? (
        <p className="text-sm text-muted-foreground">
          Showing {from}–{to} of {total}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <span className="text-sm text-muted-foreground px-1">{page} / {totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="gap-1"
        >
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
