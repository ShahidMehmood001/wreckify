"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Users, Building2, Activity, ScanLine, FileText,
  CheckCircle2, XCircle, UserPlus, Wifi, WifiOff, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  profile?: { firstName?: string; lastName?: string };
}

interface AdminWorkshop {
  id: string;
  name: string;
  city: string;
  status: string;
  user: { email: string };
}

interface ScraperLog {
  id: string;
  source: string;
  status: string;
  recordsAdded: number;
  startedAt: string;
  errorMessage?: string;
}

interface Analytics {
  users: { total: number };
  scans: { total: number; completed: number };
  reports: { total: number };
  workshops: { total: number; approved: number };
}

export default function AdminPage() {
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [pendingWorkshops, setPendingWorkshops] = useState<AdminWorkshop[]>([]);
  const [hasMorePending, setHasMorePending] = useState(false);
  const [latestLog, setLatestLog] = useState<ScraperLog | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  useEffect(() => {
    Promise.all([
      api.get("/admin/analytics").then((r) => setAnalytics(r.data)),
      api.get("/admin/users?limit=5").then((r) => {
        const users = r.data.users ?? r.data;
        setRecentUsers(Array.isArray(users) ? users.slice(0, 5) : []);
      }),
      api.get("/admin/workshops?status=PENDING&limit=6").then((r) => {
        const list: AdminWorkshop[] = r.data.workshops ?? r.data;
        setHasMorePending(list.length === 6);
        setPendingWorkshops(list.slice(0, 5));
      }),
      api.get("/admin/scraper/logs?limit=1").then((r) => {
        const logs = r.data.logs ?? r.data;
        setLatestLog(Array.isArray(logs) ? (logs[0] ?? null) : null);
      }),
    ]).finally(() => setLoading(false));
  }, []);

  async function approveWorkshop(workshopId: string, status: "APPROVED" | "REJECTED") {
    try {
      await api.patch(`/admin/workshops/${workshopId}/status`, { status });
      setPendingWorkshops((prev) => prev.filter((w) => w.id !== workshopId));
      toast.success(`Workshop ${status === "APPROVED" ? "approved" : "rejected"}.`);
    } catch {
      toast.error("Failed to update workshop.");
    }
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">{today}</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Users className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{loading ? "—" : (analytics?.users.total ?? 0)}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <ScanLine className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{loading ? "—" : (analytics?.scans.total ?? 0)}</p>
              <p className="text-sm text-muted-foreground">Total Scans</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <Building2 className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">
                {loading ? "—" : (analytics?.workshops.approved ?? 0)}
                <span className="text-muted-foreground text-lg font-normal">
                  /{loading ? "—" : (analytics?.workshops.total ?? 0)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">Workshops Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <FileText className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{loading ? "—" : (analytics?.reports.total ?? 0)}</p>
              <p className="text-sm text-muted-foreground">Reports Generated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals + Recent Registrations */}
      <div className="grid md:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pending Approvals
              {!loading && pendingWorkshops.length > 0 && (
                <Badge variant="secondary">{pendingWorkshops.length}{hasMorePending ? "+" : ""}</Badge>
              )}
            </CardTitle>
            <CardDescription>Workshops awaiting review</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : pendingWorkshops.length === 0 ? (
              <div className="flex items-center gap-2 py-6 justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-sm text-muted-foreground">All workshops reviewed</p>
              </div>
            ) : (
              <div className="space-y-0">
                <div className="divide-y">
                  {pendingWorkshops.map((w) => (
                    <div key={w.id} className="flex items-center justify-between py-3 gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{w.name}</p>
                        <p className="text-xs text-muted-foreground">{w.city} · {w.user.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => approveWorkshop(w.id, "APPROVED")}>
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => approveWorkshop(w.id, "REJECTED")}>
                          <XCircle className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMorePending && (
                  <div className="pt-3 border-t mt-1">
                    <Link href="/admin/workshops?filter=PENDING" className="flex items-center gap-1 text-sm text-primary hover:underline">
                      View all pending <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Recent Registrations
            </CardTitle>
            <CardDescription>Last 5 users who joined</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No users yet.</p>
            ) : (
              <div className="divide-y">
                {recentUsers.map((u) => {
                  const name = u.profile?.firstName
                    ? `${u.profile.firstName} ${u.profile.lastName ?? ""}`.trim()
                    : null;
                  return (
                    <div key={u.id} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name ?? u.email}</p>
                        {name && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">{u.role}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Activity className="w-4 h-4" /> System Health</span>
            <Link href="/admin/scraper" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              View logs <ArrowRight className="w-3 h-3" />
            </Link>
          </CardTitle>
          <CardDescription>Latest data collection run</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-14 bg-muted rounded-lg animate-pulse" />
          ) : !latestLog ? (
            <div className="flex items-center gap-2 py-4">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No scraper runs recorded yet.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {latestLog.status === "success"
                  ? <Wifi className="w-5 h-5 text-green-500" />
                  : <WifiOff className="w-5 h-5 text-destructive" />
                }
                <div>
                  <p className="text-sm font-medium capitalize">{latestLog.source}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(latestLog.startedAt)}</p>
                  {latestLog.errorMessage && (
                    <p className="text-xs text-destructive mt-0.5">{latestLog.errorMessage}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{latestLog.recordsAdded} records</span>
                <Badge variant={latestLog.status === "success" ? "default" : "destructive"}>
                  {latestLog.status}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
