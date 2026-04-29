"use client";
import { useEffect, useState } from "react";
import { Activity, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const LIMIT = 20;
type Filter = "all" | "success" | "failed";

interface ScraperLog {
  id: string;
  source: string;
  status: string;
  recordsAdded: number;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
}

export default function AdminScraperPage() {
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/scraper/logs?page=${page}&limit=${LIMIT}`)
      .then((r) => {
        setLogs(r.data.logs ?? r.data);
        setTotal(r.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = logs.filter((l) => {
    if (filter === "success") return l.status === "success";
    if (filter === "failed") return l.status !== "success";
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scraper Logs</h1>
        <p className="text-muted-foreground mt-1">History of automated data collection runs</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(["all", "success", "failed"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {loading ? "—" : total} {total === 1 ? "Run" : "Runs"}
          </CardTitle>
          <CardDescription>
            {filter === "all" ? "All scraper runs" : `Showing ${filter} runs`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {filter === "all" ? "No scraper runs recorded yet." : `No ${filter} runs on this page.`}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((log) => (
                <div key={log.id} className="py-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      {log.status === "success"
                        ? <Wifi className="w-4 h-4 text-green-500 shrink-0" />
                        : <WifiOff className="w-4 h-4 text-destructive shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{log.source}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span>Started: {formatDate(log.startedAt)}</span>
                          {log.finishedAt && <span>Finished: {formatDate(log.finishedAt)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-muted-foreground">{log.recordsAdded} records</span>
                      <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-xs">
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                  {log.errorMessage && (
                    <p className="text-xs text-destructive mt-1.5 ml-7 bg-destructive/5 px-2 py-1 rounded">
                      {log.errorMessage}
                    </p>
                  )}
                </div>
              ))}
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
