"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, Clock, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate, scanStatusColor } from "@/lib/utils";
import type { Scan } from "@/types";

const LIMIT = 20;

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get(`/scans?page=${page}&limit=${LIMIT}`)
      .then((r) => {
        setScans(r.data.data);
        setTotal(r.data.total);
        setTotalPages(r.data.totalPages);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Scans</h1>
          <p className="text-muted-foreground mt-1">All your vehicle damage assessments</p>
        </div>
        <Button asChild>
          <Link href="/scan"><Zap className="w-4 h-4" /> New Scan</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment History</CardTitle>
          <CardDescription>{total} total scan{total !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : scans.length === 0 && page === 1 ? (
            <div className="text-center py-16">
              <ScanLine className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-1">No scans yet</h3>
              <p className="text-muted-foreground mb-6">Upload vehicle photos to get your first damage assessment.</p>
              <Button asChild><Link href="/scan">Start First Scan</Link></Button>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {scans.map((scan) => (
                  <Link key={scan.id} href={`/scans/${scan.id}`}>
                    <div className="flex items-center justify-between py-4 hover:bg-muted/30 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <ScanLine className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {scan.vehicle
                              ? `${scan.vehicle.make} ${scan.vehicle.model} ${scan.vehicle.year}`
                              : "Unknown Vehicle"}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatDate(scan.createdAt)}
                            </span>
                            {(scan._count?.detectedParts ?? 0) > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {scan._count?.detectedParts} part{scan._count?.detectedParts !== 1 ? "s" : ""} detected
                              </span>
                            )}
                            {scan.costEstimate && (
                              <span className="text-xs font-medium text-primary">
                                PKR {Number(scan.costEstimate.totalMin).toLocaleString()}–{Number(scan.costEstimate.totalMax).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {scan.report && (
                          <Badge variant="outline" className="text-xs">PDF Ready</Badge>
                        )}
                        <Badge className={scanStatusColor(scan.status)}>{scan.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page === 1 || loading}
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page === totalPages || loading}
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
