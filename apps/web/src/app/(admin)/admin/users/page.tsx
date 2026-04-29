"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

const LIMIT = 20;

interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  profile?: { firstName?: string; lastName?: string };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const totalPages = Math.ceil(total / LIMIT);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/users?page=${page}&limit=${LIMIT}`)
      .then((r) => {
        setUsers(r.data.users ?? r.data);
        setTotal(r.data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setSearch("");
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
      toast.success("Role updated.");
    } catch {
      toast.error("Failed to update role.");
    }
  }

  async function updateUserStatus(userId: string, isActive: boolean) {
    try {
      await api.patch(`/admin/users/${userId}/status`, { isActive });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive } : u));
      toast.success(`User ${isActive ? "activated" : "deactivated"}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const name = u.profile?.firstName
      ? `${u.profile.firstName} ${u.profile.lastName ?? ""}`.toLowerCase()
      : "";
    return u.email.toLowerCase().includes(term) || name.includes(term);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">Manage user roles and account status</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {loading ? "—" : total} {total === 1 ? "User" : "Users"}
            </CardTitle>
            <CardDescription>Page {page} of {totalPages || 1}</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {search ? "No users match your search." : "No users found."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((u) => {
                const name = u.profile?.firstName
                  ? `${u.profile.firstName} ${u.profile.lastName ?? ""}`.trim()
                  : null;
                return (
                  <div key={u.id} className="flex items-center justify-between py-3 gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{name ?? u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {name ? u.email + " · " : ""}{formatDate(u.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <Badge variant={u.isActive ? "default" : "secondary"} className="text-xs">
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Select value={u.role} onValueChange={(v) => updateUserRole(u.id, v)}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["OWNER", "MECHANIC", "INSURANCE_AGENT", "ADMIN"].map((r) => (
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
                );
              })}
            </div>
          )}

          <PaginationControls
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
