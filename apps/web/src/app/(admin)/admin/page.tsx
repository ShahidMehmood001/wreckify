"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Users, Building2, Activity, ScanLine, FileText,
  CheckCircle2, XCircle, UserPlus, Wifi, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  finishedAt?: string;
  errorMessage?: string;
}

interface Analytics {
  users: { total: number };
  scans: { total: number; completed: number };
  reports: { total: number };
  workshops: { total: number; approved: number };
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workshops, setWorkshops] = useState<AdminWorkshop[]>([]);
  const [scraperLogs, setScraperLogs] = useState<ScraperLog[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  useEffect(() => {
    Promise.all([
      api.get("/admin/users").then((r) => setUsers(r.data.users ?? r.data)),
      api.get("/admin/workshops").then((r) => setWorkshops(r.data)),
      api.get("/admin/scraper/logs").then((r) => setScraperLogs(r.data.slice(0, 10))),
      api.get("/admin/analytics").then((r) => setAnalytics(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  async function updateUserRole(userId: string, role: string) {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      toast.success("Role updated.");
    } catch {
      toast.error("Failed to update role.");
    }
  }

  async function updateUserStatus(userId: string, isActive: boolean) {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive } : u)));
      toast.success(`User ${isActive ? "activated" : "deactivated"}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  }

  async function updateWorkshopStatus(workshopId: string, status: string) {
    try {
      await api.patch(`/admin/workshops/${workshopId}/status`, { status });
      setWorkshops((prev) => prev.map((w) => (w.id === workshopId ? { ...w, status } : w)));
      toast.success("Workshop status updated.");
    } catch {
      toast.error("Failed to update workshop.");
    }
  }

  const pendingWorkshops = workshops.filter((w) => w.status === "PENDING");
  const recentUsers = [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const latestScraper = scraperLogs[0] ?? null;

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
              <p className="text-2xl font-bold">{loading ? "—" : (analytics?.users.total ?? users.length)}</p>
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
                  /{loading ? "—" : (analytics?.workshops.total ?? workshops.length)}
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

        {/* Pending Workshop Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pending Approvals
              {!loading && pendingWorkshops.length > 0 && (
                <Badge variant="secondary">{pendingWorkshops.length}</Badge>
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
              <div className="flex items-center gap-2 py-6 text-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <p className="text-sm text-muted-foreground">All workshops reviewed</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingWorkshops.map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-3 gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.city} · {w.user.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => updateWorkshopStatus(w.id, "APPROVED")}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={() => updateWorkshopStatus(w.id, "REJECTED")}
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Registrations */}
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
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4" /> System Health
          </CardTitle>
          <CardDescription>Latest data collection run</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-14 bg-muted rounded-lg animate-pulse" />
          ) : !latestScraper ? (
            <div className="flex items-center gap-2 py-4">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No scraper runs recorded yet.</p>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {latestScraper.status === "success"
                  ? <Wifi className="w-5 h-5 text-green-500" />
                  : <WifiOff className="w-5 h-5 text-destructive" />
                }
                <div>
                  <p className="text-sm font-medium capitalize">{latestScraper.source}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(latestScraper.startedAt)}</p>
                  {latestScraper.errorMessage && (
                    <p className="text-xs text-destructive mt-0.5">{latestScraper.errorMessage}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{latestScraper.recordsAdded} records</span>
                <Badge variant={latestScraper.status === "success" ? "default" : "destructive"}>
                  {latestScraper.status}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Management Section */}
      <div className="border-t pt-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Full control over users, workshops, and scraper logs</p>
        </div>

        {/* Users */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage user roles and account status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No users found.</p>
            ) : (
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-3 gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">
                        {u.profile?.firstName ? `${u.profile.firstName} ${u.profile.lastName ?? ""}`.trim() : u.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email} · {formatDate(u.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={u.isActive ? "default" : "secondary"}>
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Select value={u.role} onValueChange={(v) => updateUserRole(u.id, v)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["OWNER", "MECHANIC", "INSURANCE_AGENT", "ADMIN"].map(r => (
                            <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => updateUserStatus(u.id, !u.isActive)}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workshop Approvals (full list) */}
        <Card>
          <CardHeader>
            <CardTitle>Workshop Approvals</CardTitle>
            <CardDescription>Review and manage all workshop registrations</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : workshops.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No workshops registered yet.</p>
            ) : (
              <div className="divide-y">
                {workshops.map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.city} · {w.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={w.status === "APPROVED" ? "default" : w.status === "PENDING" ? "secondary" : "destructive"}>
                        {w.status}
                      </Badge>
                      <Select value={w.status} onValueChange={(v) => updateWorkshopStatus(w.id, v)}>
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["PENDING", "APPROVED", "REJECTED", "SUSPENDED"].map(s => (
                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scraper Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Scraper Logs</CardTitle>
            <CardDescription>Last 10 data collection runs</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : scraperLogs.length === 0 ? (
              <div className="flex items-center gap-3 py-6 text-center justify-center">
                <Activity className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No scraper runs recorded yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {scraperLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium capitalize">{log.source}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(log.startedAt)}</p>
                      {log.errorMessage && (
                        <p className="text-xs text-destructive mt-0.5 truncate max-w-sm">{log.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{log.recordsAdded} records</span>
                      <Badge variant={log.status === "success" ? "default" : "destructive"}>
                        {log.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
