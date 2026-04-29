"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const LIMIT = 20;

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"] as const;
type Filter = typeof FILTERS[number];

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

interface AdminWorkshop {
  id: string;
  name: string;
  city: string;
  status: string;
  createdAt: string;
  user: { email: string; profile?: { firstName?: string; lastName?: string } };
  _count?: { inquiries: number };
}

function WorkshopsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialFilter = (searchParams.get("filter") as Filter) ?? "ALL";
  const [filter, setFilter] = useState<Filter>(
    FILTERS.includes(initialFilter) ? initialFilter : "ALL"
  );
  const [workshops, setWorkshops] = useState<AdminWorkshop[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    setLoading(true);
    const statusParam = filter !== "ALL" ? `&status=${filter}` : "";
    api.get(`/admin/workshops?page=${page}&limit=${LIMIT}${statusParam}`)
      .then((r) => {
        setWorkshops(r.data.workshops ?? r.data);
        setTotal(r.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [filter, page]);

  function handleFilterChange(f: Filter) {
    setFilter(f);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (f === "ALL") params.delete("filter");
    else params.set("filter", f);
    router.replace(`/admin/workshops?${params.toString()}`);
  }

  async function updateWorkshopStatus(workshopId: string, status: string) {
    try {
      await api.patch(`/admin/workshops/${workshopId}/status`, { status });
      setWorkshops((prev) => prev.map((w) => w.id === workshopId ? { ...w, status } : w));
      toast.success("Workshop status updated.");
    } catch {
      toast.error("Failed to update workshop.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workshops</h1>
        <p className="text-muted-foreground mt-1">Review and manage workshop registrations</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {loading ? "—" : total} {total === 1 ? "Workshop" : "Workshops"}
          </CardTitle>
          <CardDescription>
            {filter === "ALL" ? "All registered workshops" : `Filtered by: ${filter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : workshops.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {filter === "ALL" ? "No workshops registered yet." : `No ${filter.toLowerCase()} workshops.`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {workshops.map((w) => {
                const ownerName = w.user.profile?.firstName
                  ? `${w.user.profile.firstName} ${w.user.profile.lastName ?? ""}`.trim()
                  : null;
                return (
                  <div key={w.id} className="flex items-center justify-between py-3 gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.city} · {ownerName ?? w.user.email}
                        {ownerName && ` (${w.user.email})`}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{formatDate(w.createdAt)}</span>
                        {w._count !== undefined && (
                          <span className="text-xs text-muted-foreground">{w._count.inquiries} inquiries</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusVariant[w.status] ?? "secondary"} className="text-xs">
                        {w.status}
                      </Badge>
                      <Select value={w.status} onValueChange={(v) => updateWorkshopStatus(w.id, v)}>
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map((s) => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={(p) => setPage(p)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminWorkshopsPage() {
  return (
    <Suspense>
      <WorkshopsContent />
    </Suspense>
  );
}
