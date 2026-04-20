"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload, X, Loader2, Zap, CheckCircle, Car, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn, severityColor, formatCurrency } from "@/lib/utils";
import type { Scan, Vehicle } from "@/types";
import { useEffect } from "react";

type Step = "upload" | "detecting" | "detected" | "estimating" | "done";

export default function NewScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [scan, setScan] = useState<Scan | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  useEffect(() => {
    api.get("/vehicles").then((r) => setVehicles(r.data)).catch(() => {});
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024,
  });

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleDetect() {
    if (files.length === 0) {
      toast.error("Please upload at least one image.");
      return;
    }
    setStep("detecting");
    try {
      const createRes = await api.post("/scans", {
        vehicleId: selectedVehicleId || undefined,
      });
      const newScan: Scan = createRes.data;

      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));
      await api.post(`/scans/${newScan.id}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const detectRes = await api.post(`/scans/${newScan.id}/detect`);
      setScan(detectRes.data);
      setStep("detected");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Detection failed. Please try again.");
      setStep("upload");
    }
  }

  async function handleEstimate() {
    if (!scan) return;
    setStep("estimating");
    try {
      const res = await api.post(`/scans/${scan.id}/estimate`);
      setScan(res.data);
      setStep("done");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Estimation failed.");
      setStep("detected");
    }
  }

  async function handleGenerateReport() {
    if (!scan) return;
    try {
      await api.post(`/reports/${scan.id}`);
      toast.success("Report generated!");
      router.push(`/scans/${scan.id}`);
    } catch {
      toast.error("Could not generate report.");
    }
  }

  const stepLabels: Step[] = ["upload", "detecting", "detected", "estimating", "done"];
  const stepIdx = stepLabels.indexOf(step);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Damage Assessment</h1>
        <p className="text-muted-foreground mt-1">Upload vehicle photos to detect damage and estimate repair costs.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-sm">
        {["Upload", "Detect", "Estimate"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2",
              stepIdx > i * 2
                ? "bg-primary border-primary text-white"
                : stepIdx === i * 2 || (i === 1 && (step === "detecting" || step === "detected")) || (i === 2 && (step === "estimating" || step === "done"))
                ? "border-primary text-primary"
                : "border-muted text-muted-foreground"
            )}>
              {stepIdx > i * 2 + 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              "font-medium",
              stepIdx >= i * 2 ? "text-foreground" : "text-muted-foreground"
            )}>{label}</span>
            {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Upload Step */}
      {(step === "upload" || step === "detecting") && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Vehicle Photos</CardTitle>
            <CardDescription>Upload up to 5 photos (JPG, PNG, WebP · max 10MB each)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vehicles.length > 0 && (
              <div className="space-y-2">
                <Label>Link to a vehicle (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                >
                  <option value="">— No vehicle selected —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} {v.year}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">Drop images here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">Up to 5 images · JPG, PNG, WebP</p>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {files.map((file, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-24 object-cover"
                    />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <p className="text-xs text-center text-muted-foreground p-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleDetect}
              disabled={files.length === 0 || step === "detecting"}
            >
              {step === "detecting" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Detecting damage...</>
              ) : (
                <><Zap className="w-4 h-4" /> Detect Damage</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Detection Results */}
      {(step === "detected" || step === "estimating" || step === "done") && scan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Damage Detected
            </CardTitle>
            <CardDescription>
              {scan.detectedParts.length} damaged part{scan.detectedParts.length !== 1 ? "s" : ""} identified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scan.detectedParts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No damage detected in the uploaded images.</p>
            ) : (
              scan.detectedParts.map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{part.partName.replace(/_/g, " ")}</p>
                    {part.description && <p className="text-xs text-muted-foreground mt-0.5">{part.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{Math.round(part.confidenceScore * 100)}%</span>
                    <Badge className={severityColor(part.severity)}>{part.severity}</Badge>
                  </div>
                </div>
              ))
            )}

            {step === "detected" && (
              <Button className="w-full mt-2" size="lg" onClick={handleEstimate}>
                <Zap className="w-4 h-4" /> Get Cost Estimate
              </Button>
            )}
            {step === "estimating" && (
              <Button className="w-full mt-2" size="lg" disabled>
                <Loader2 className="w-4 h-4 animate-spin" /> Estimating costs...
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cost Estimate */}
      {step === "done" && scan?.costEstimate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Cost Estimate
            </CardTitle>
            <CardDescription>Estimated repair costs in Pakistani Rupees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Estimated Cost</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(Number(scan.costEstimate.totalMin))} – {formatCurrency(Number(scan.costEstimate.totalMax))}
              </p>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground px-3">
                <span className="col-span-2">Part</span>
                <span className="text-right">Parts</span>
                <span className="text-right">Labour</span>
                <span className="text-right">Total</span>
              </div>
              {scan.costEstimate.lineItems.map((item, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 text-sm px-3 py-2 rounded-lg hover:bg-muted/50">
                  <span className="col-span-2 capitalize font-medium">{item.part.replace(/_/g, " ")}</span>
                  <span className="text-right text-muted-foreground text-xs">
                    {formatCurrency(item.partsMin)}–{formatCurrency(item.partsMax)}
                  </span>
                  <span className="text-right text-muted-foreground text-xs">
                    {formatCurrency(item.laborMin)}–{formatCurrency(item.laborMax)}
                  </span>
                  <span className="text-right font-medium">
                    {formatCurrency(item.partsMin + item.laborMin)}+
                  </span>
                </div>
              ))}
            </div>

            {scan.costEstimate.narrative && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                {scan.costEstimate.narrative}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleGenerateReport}>
                <Car className="w-4 h-4" /> Generate PDF Report
              </Button>
              <Button variant="outline" onClick={() => router.push(`/scans/${scan.id}`)}>
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
