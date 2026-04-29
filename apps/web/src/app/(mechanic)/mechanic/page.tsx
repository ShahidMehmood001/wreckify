"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MessageSquare, Building2, CheckCircle2, Clock,
  ArrowRight, Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Workshop, RepairInquiry } from "@/types";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDING: "secondary",
  RESPONDED: "default",
  CLOSED: "outline",
};

const workshopStatusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

export default function MechanicDashboardPage() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<RepairInquiry[]>([]);
  const [workshop, setWorkshop] = useState<Workshop | null | false>(null); // false = not registered
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/users/profile").then((r) => setFirstName(r.data.profile?.firstName ?? null)),
      api.get("/workshops/my/inquiries").then((r) => setInquiries(r.data)),
      api.get("/workshops/my").then((r) => setWorkshop(r.data)).catch(() => setWorkshop(false)),
    ]).finally(() => setLoading(false));
  }, []);

  async function closeInquiry(inquiryId: string) {
    try {
      await api.patch(`/workshops/inquiries/${inquiryId}/respond`, { status: "CLOSED" });
      setInquiries((prev) => prev.map((i) => i.id === inquiryId ? { ...i, status: "CLOSED" } : i));
      toast.success("Inquiry closed.");
    } catch {
      toast.error("Failed to close inquiry.");
    }
  }

  const openCount = inquiries.filter((i) => i.status === "PENDING" || i.status === "RESPONDED").length;
  const recentInquiries = inquiries.slice(0, 5);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your workshop overview.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Inquiries</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "—" : openCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting your response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Workshop Status</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-24 bg-muted rounded animate-pulse mt-1" />
            ) : workshop === false ? (
              <>
                <div className="text-lg font-semibold text-muted-foreground">Not Registered</div>
                <p className="text-xs text-muted-foreground mt-1">No workshop linked to your account</p>
              </>
            ) : workshop ? (
              <>
                <Badge variant={workshopStatusVariant[workshop.status]} className="text-sm px-2 py-0.5">
                  {workshop.status}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">{workshop.name} · {workshop.city}</p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inquiries</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? "—" : inquiries.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime received</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Inquiries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Inquiries</CardTitle>
            <CardDescription>Last 5 repair requests</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/mechanic/inquiries">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
            </div>
          ) : recentInquiries.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No inquiries yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vehicle owners will send repair requests to your workshop here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {recentInquiries.map((inq) => {
                const senderName = inq.sender?.profile?.firstName
                  ? `${inq.sender.profile.firstName} ${inq.sender.profile.lastName ?? ""}`.trim()
                  : inq.sender?.email ?? "Unknown";
                const isOpen = inq.status !== "CLOSED";
                return (
                  <div key={inq.id} className="flex items-start justify-between py-3 gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {isOpen
                          ? <Clock className="w-4 h-4 text-muted-foreground" />
                          : <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{senderName}</p>
                        {inq.message && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{inq.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(inq.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusVariant[inq.status]} className="text-xs">
                        {inq.status}
                      </Badge>
                      {isOpen && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => closeInquiry(inq.id)}
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
