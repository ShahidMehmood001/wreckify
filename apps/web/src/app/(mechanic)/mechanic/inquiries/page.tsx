"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Inbox, ScanLine, CheckCircle2, Clock, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { RepairInquiry } from "@/types";

type Filter = "all" | "open" | "closed";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "secondary",
  RESPONDED: "default",
  CLOSED: "outline",
};

export default function MechanicInquiriesPage() {
  const [inquiries, setInquiries] = useState<RepairInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const [respondingTo, setRespondingTo] = useState<RepairInquiry | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/workshops/my/inquiries")
      .then((r) => setInquiries(r.data))
      .finally(() => setLoading(false));
  }, []);

  function openRespondDialog(inq: RepairInquiry) {
    setRespondingTo(inq);
    setReplyMessage("");
  }

  async function submitResponse(status: "RESPONDED" | "CLOSED") {
    if (!respondingTo) return;
    setSubmitting(true);
    try {
      await api.patch(`/workshops/inquiries/${respondingTo.id}`, {
        status,
        message: replyMessage.trim() || undefined,
      });
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === respondingTo.id ? { ...i, status, message: replyMessage.trim() || i.message } : i,
        ),
      );
      toast.success(status === "CLOSED" ? "Inquiry closed." : "Response sent.");
      setRespondingTo(null);
    } catch {
      toast.error("Failed to update inquiry.");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = inquiries.filter((i) => {
    if (filter === "open") return i.status !== "CLOSED";
    if (filter === "closed") return i.status === "CLOSED";
    return true;
  });

  const openCount = inquiries.filter((i) => i.status !== "CLOSED").length;
  const closedCount = inquiries.filter((i) => i.status === "CLOSED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inquiries</h1>
        <p className="text-muted-foreground mt-1">Repair requests sent to your workshop</p>
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
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
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
                : "No inquiries yet"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {filter === "all"
              ? "Vehicle owners will send repair requests to your workshop here."
              : "Switch to a different filter to see other inquiries."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inq) => {
            const senderName = inq.sender?.profile?.firstName
              ? `${inq.sender.profile.firstName} ${inq.sender.profile.lastName ?? ""}`.trim()
              : null;
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
                          <p className="text-sm font-medium">
                            {senderName ?? inq.sender?.email ?? "Unknown"}
                          </p>
                          {senderName && (
                            <p className="text-xs text-muted-foreground">{inq.sender?.email}</p>
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
                            {formatDate(inq.createdAt)}
                          </span>
                        </div>
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
                          className="h-7 text-xs gap-1"
                          onClick={() => openRespondDialog(inq)}
                        >
                          <MessageSquare className="w-3 h-3" />
                          Respond
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!respondingTo}
        onOpenChange={(open) => {
          if (!open) setRespondingTo(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Respond to Inquiry</DialogTitle>
            <DialogDescription>
              From{" "}
              {respondingTo?.sender?.profile?.firstName
                ? `${respondingTo.sender.profile.firstName} ${respondingTo.sender.profile.lastName ?? ""}`.trim()
                : respondingTo?.sender?.email ?? "Unknown"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {respondingTo?.message && (
              <div className="rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                &ldquo;{respondingTo.message}&rdquo;
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Your reply (optional)</Label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your response to the customer…"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRespondingTo(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => submitResponse("CLOSED")}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Close Inquiry
            </Button>
            <Button onClick={() => submitResponse("RESPONDED")} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
