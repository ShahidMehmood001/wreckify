"use client";
import { useEffect, useState } from "react";
import { Building2, Inbox, Clock, CheckCircle2, ScanLine, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { RepairInquiry, InquiryStatus } from "@/types";

type Filter = "all" | "open" | "closed";

const statusVariant: Record<InquiryStatus, "default" | "secondary" | "outline"> = {
  PENDING: "secondary",
  RESPONDED: "default",
  CLOSED: "outline",
};

const statusLabel: Record<InquiryStatus, string> = {
  PENDING: "Pending",
  RESPONDED: "Responded",
  CLOSED: "Closed",
};

export default function OwnerInquiriesPage() {
  const [inquiries, setInquiries] = useState<RepairInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    api
      .get("/workshops/inquiries/my")
      .then((r) => setInquiries(r.data))
      .finally(() => setLoading(false));
  }, []);

  const openCount = inquiries.filter((i) => i.status !== "CLOSED").length;
  const closedCount = inquiries.filter((i) => i.status === "CLOSED").length;

  const filtered = inquiries.filter((i) => {
    if (filter === "open") return i.status !== "CLOSED";
    if (filter === "closed") return i.status === "CLOSED";
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Inquiries</h1>
        <p className="text-muted-foreground mt-1">Repair requests you&apos;ve sent to workshops</p>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(["all", "open", "closed"] as Filter[]).map((f) => {
          const count = f === "all" ? inquiries.length : f === "open" ? openCount : closedCount;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize flex items-center gap-1.5 ${
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
              {!loading && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filter === f ? "bg-primary/10 text-primary" : "bg-muted-foreground/20"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">
            {filter === "open"
              ? "No open inquiries"
              : filter === "closed"
                ? "No closed inquiries"
                : "No inquiries sent yet"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {filter === "all"
              ? "Browse workshops and send a repair inquiry to get started."
              : "Switch to a different filter to see other inquiries."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inq) => {
            const isOpen = inq.status !== "CLOSED";
            return (
              <Card key={inq.id}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {isOpen ? (
                          <Clock className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {inq.workshop?.name ?? "Workshop"}
                          </p>
                          {inq.workshop?.city && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {inq.workshop.city}
                            </p>
                          )}
                        </div>
                        {inq.message && (
                          <p className="text-sm text-muted-foreground">{inq.message}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          {inq.scanId && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              <ScanLine className="w-3 h-3" />
                              Scan attached
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Sent {formatDate(inq.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusVariant[inq.status]} className="text-xs shrink-0">
                      {statusLabel[inq.status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
