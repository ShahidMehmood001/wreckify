"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Users, Building2, Activity, Shield, ScanLine, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
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
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workshops, setWorkshops] = useState<AdminWorkshop[]>([]);
  const [scraperLogs, setScraperLogs] = useState<ScraperLog[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground mt-0.5">Manage users, workshops, and system logs</p>
        </div>
      </div>

      {/* Analytics Stats */}
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
              <p className="text-2xl font-bold">{loading ? "—" : (analytics?.workshops.approved ?? 0)}<span className="text-muted-foreground text-lg font-normal">/{analytics?.workshops.total ?? workshops.length}</span></p>
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

      {/* Workshops */}
      <Card>
        <CardHeader>
          <CardTitle>Workshop Approvals</CardTitle>
          <CardDescription>Review and approve workshop registrations</CardDescription>
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
  );
}
