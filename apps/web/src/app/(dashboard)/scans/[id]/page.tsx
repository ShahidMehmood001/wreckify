"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Loader2, AlertTriangle, Car,
  Clock, Zap, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { formatDate, formatCurrency, scanStatusColor, severityColor } from "@/lib/utils";
import type { Scan } from "@/types";

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    api.get(`/scans/${id}`).then((r) => setScan(r.data)).finally(() => setLoading(false));
  }, [id]);

  async function handleEstimate() {
    if (!scan) return;
    setEstimating(true);
    try {
      const res = await api.post(`/scans/${scan.id}/estimate`);
      setScan(res.data);
      toast.success("Cost estimate generated.");
    } catch {
      toast.error("Estimation failed.");
    } finally {
      setEstimating(false);
    }
  }

  async function handleGenerateReport(type: "standard" | "insurance" = "standard") {
    if (!scan) return;
    setGeneratingReport(true);
    try {
      const res = await api.post(`/reports/${scan.id}`, { type });
      setScan((prev) => prev ? { ...prev, report: res.data } : prev);
      toast.success("PDF report generated.");
    } catch {
      toast.error("Failed to generate report.");
    } finally {
      setGeneratingReport(false);
    }
  }

  function handleDownloadReport() {
    if (!scan?.report) return;
    const fileName = scan.report.fileUrl.split("/").pop();
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/api/reports/files/${fileName}`, "_blank");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Scan not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {scan.vehicle ? `${scan.vehicle.make} ${scan.vehicle.model} ${scan.vehicle.year}` : "Damage Assessment"}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(scan.createdAt)}
            </span>
            <Badge className={scanStatusColor(scan.status)}>{scan.status}</Badge>
          </div>
        </div>
        {scan.report ? (
          <Button onClick={handleDownloadReport}>
            <Download className="w-4 h-4" /> Download Report
          </Button>
        ) : scan.status === "COMPLETED" && (
          <Button onClick={() => handleGenerateReport()} disabled={generatingReport}>
            {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generate Report
          </Button>
        )}
      </div>

      {/* Images */}
      {scan.images && scan.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {scan.images.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt="Vehicle"
                  className="w-full h-24 object-cover rounded-lg border"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detected Parts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Detected Damage
            </CardTitle>
            <CardDescription>
              {scan.detectedParts?.length ?? 0} part{(scan.detectedParts?.length ?? 0) !== 1 ? "s" : ""} identified
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!scan.detectedParts || scan.detectedParts.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No damage detected.</p>
          ) : (
            <div className="space-y-2">
              {scan.detectedParts.map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{part.partName.replace(/_/g, " ")}</p>
                    {part.description && <p className="text-xs text-muted-foreground mt-0.5">{part.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{Math.round(part.confidenceScore * 100)}% confidence</span>
                    <Badge className={severityColor(part.severity)}>{part.severity}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Estimate */}
      {scan.costEstimate ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" /> Cost Estimate
            </CardTitle>
            <CardDescription>Generated {formatDate(scan.costEstimate.generatedAt)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Estimated Cost</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(Number(scan.costEstimate.totalMin))} – {formatCurrency(Number(scan.costEstimate.totalMax))}
              </p>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground px-3">
                <span className="col-span-2">Part</span>
                <span className="text-right">Parts (PKR)</span>
                <span className="text-right">Labour (PKR)</span>
                <span className="text-right">Total</span>
              </div>
              {scan.costEstimate.lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 text-sm px-3 py-2 rounded hover:bg-muted/50">
                  <span className="col-span-2 capitalize font-medium">{item.part.replace(/_/g, " ")}</span>
                  <span className="text-right text-xs text-muted-foreground">
                    {formatCurrency(item.partsMin)}–{formatCurrency(item.partsMax)}
                  </span>
                  <span className="text-right text-xs text-muted-foreground">
                    {formatCurrency(item.laborMin)}–{formatCurrency(item.laborMax)}
                  </span>
                  <span className="text-right font-semibold text-primary">
                    {formatCurrency(item.partsMin + item.laborMin)}+
                  </span>
                </div>
              ))}
            </div>
            {scan.costEstimate.narrative && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed">
                {scan.costEstimate.narrative}
              </div>
            )}
          </CardContent>
        </Card>
      ) : scan.status === "COMPLETED" && scan.detectedParts?.length > 0 && (
        <Card>
          <CardContent className="pt-6 text-center py-10">
            <p className="text-muted-foreground mb-4">No cost estimate yet.</p>
            <Button onClick={handleEstimate} disabled={estimating}>
              {estimating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Generate Estimate
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
