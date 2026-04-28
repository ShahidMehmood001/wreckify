"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Building2, MapPin, Phone, Star, Send, MessageSquare, CheckCircle2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { formatDate } from "@/lib/utils";
import type { Workshop, Scan, RepairInquiry } from "@/types";

const inquiryStatusIcon = {
  PENDING: <Clock className="w-3.5 h-3.5" />,
  RESPONDED: <CheckCircle2 className="w-3.5 h-3.5" />,
  CLOSED: <CheckCircle2 className="w-3.5 h-3.5" />,
};

const inquiryStatusVariant: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "secondary",
  RESPONDED: "default",
  CLOSED: "outline",
};

export default function WorkshopsPage() {
  const { user } = useAuthStore();
  const isOwner = user?.role === "OWNER";
  const isMechanic = user?.role === "MECHANIC";

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Inquiry send dialog state
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [message, setMessage] = useState("");
  const [scanId, setScanId] = useState<string>("none");
  const [scans, setScans] = useState<Scan[]>([]);
  const [sending, setSending] = useState(false);

  // Mechanic — incoming inquiries
  const [inquiries, setInquiries] = useState<RepairInquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  useEffect(() => {
    const requests: Promise<void>[] = [
      api.get("/workshops").then((r) => setWorkshops(r.data)).finally(() => setLoading(false)),
    ];

    if (isOwner) {
      requests.push(
        api.get("/scans").then((r) => {
          const completed = (r.data as Scan[]).filter((s) => s.status === "COMPLETED");
          setScans(completed);
        }),
      );
    }

    if (isMechanic) {
      setInquiriesLoading(true);
      requests.push(
        api.get("/workshops/my/inquiries")
          .then((r) => setInquiries(r.data))
          .finally(() => setInquiriesLoading(false)),
      );
    }

    Promise.all(requests);
  }, [isOwner, isMechanic]);

  const filtered = workshops.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.city.toLowerCase().includes(search.toLowerCase()),
  );

  function openInquiryDialog(workshop: Workshop) {
    setSelectedWorkshop(workshop);
    setMessage("");
    setScanId("none");
  }

  async function submitInquiry() {
    if (!selectedWorkshop) return;
    setSending(true);
    try {
      await api.post(`/workshops/${selectedWorkshop.id}/inquiries`, {
        message: message.trim() || undefined,
        scanId: scanId !== "none" ? scanId : undefined,
      });
      toast.success(`Inquiry sent to ${selectedWorkshop.name}.`);
      setSelectedWorkshop(null);
    } catch {
      toast.error("Failed to send inquiry. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function closeInquiry(inquiryId: string) {
    try {
      await api.patch(`/workshops/inquiries/${inquiryId}`, { status: "CLOSED" });
      setInquiries((prev) => prev.map((i) => i.id === inquiryId ? { ...i, status: "CLOSED" } : i));
      toast.success("Inquiry closed.");
    } catch {
      toast.error("Failed to update inquiry.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workshops</h1>
        <p className="text-muted-foreground mt-1">Find verified repair workshops near you</p>
      </div>

      {/* Mechanic: incoming inquiries section */}
      {isMechanic && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Incoming Inquiries
            </CardTitle>
            <CardDescription>Repair requests sent to your workshop</CardDescription>
          </CardHeader>
          <CardContent>
            {inquiriesLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}
              </div>
            ) : inquiries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No inquiries yet.</p>
            ) : (
              <div className="divide-y">
                {inquiries.map((inq) => {
                  const name = inq.sender?.profile?.firstName
                    ? `${inq.sender.profile.firstName} ${inq.sender.profile.lastName ?? ""}`.trim()
                    : inq.sender?.email ?? "Unknown";
                  return (
                    <div key={inq.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{name}</p>
                        {inq.message && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{inq.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(inq.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={inquiryStatusVariant[inq.status]} className="flex items-center gap-1 text-xs">
                          {inquiryStatusIcon[inq.status]} {inq.status}
                        </Badge>
                        {inq.status !== "CLOSED" && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => closeInquiry(inq.id)}>
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
      )}

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Workshop grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">
            {search ? "No workshops found" : "No workshops available"}
          </h3>
          <p className="text-muted-foreground">
            {search ? "Try a different search term." : "Check back soon as more workshops join the network."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((w) => (
            <Card key={w.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base leading-tight">{w.name}</CardTitle>
                  {w.rating && (
                    <div className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      {w.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {w.city}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  {w.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {w.phone}
                    </p>
                  )}
                  {w.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{w.description}</p>
                  )}
                  {w.services && w.services.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {w.services.slice(0, 4).map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>
                      ))}
                      {w.services.length > 4 && (
                        <Badge variant="outline" className="text-xs">+{w.services.length - 4} more</Badge>
                      )}
                    </div>
                  )}
                </div>
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 gap-2"
                    onClick={() => openInquiryDialog(w)}
                  >
                    <Send className="w-3.5 h-3.5" /> Send Inquiry
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Send Inquiry Dialog */}
      <Dialog open={!!selectedWorkshop} onOpenChange={(open) => { if (!open) setSelectedWorkshop(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Repair Inquiry</DialogTitle>
            <DialogDescription>
              {selectedWorkshop?.name} · {selectedWorkshop?.city}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {scans.length > 0 && (
              <div className="space-y-1.5">
                <Label>Attach a scan (optional)</Label>
                <Select value={scanId} onValueChange={setScanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a completed scan…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No scan attached</SelectItem>
                    {scans.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.vehicle
                          ? `${s.vehicle.make} ${s.vehicle.model} ${s.vehicle.year}`
                          : "Unknown Vehicle"}{" "}
                        — {formatDate(s.createdAt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Message (optional)</Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the damage or repair you need…"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedWorkshop(null)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={submitInquiry} disabled={sending} className="gap-2">
              <Send className="w-3.5 h-3.5" />
              {sending ? "Sending…" : "Send Inquiry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
