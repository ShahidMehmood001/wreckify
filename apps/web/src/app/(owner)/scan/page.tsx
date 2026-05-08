"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload, X, Loader2, Zap, CheckCircle, Car, ChevronRight, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { cn, severityColor, formatCurrency } from "@/lib/utils";
import { PAKISTAN_CARS, PAKISTAN_CAR_MAKES, VEHICLE_YEARS } from "@/lib/pakistan-cars";
import type { Scan, Vehicle } from "@/types";

type Step = "upload" | "detecting" | "detected" | "estimating" | "done";

export default function NewScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [scan, setScan] = useState<Scan | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Inline registration state (shown when user has no vehicles)
  const [inlineMake, setInlineMake] = useState("");
  const [inlineModel, setInlineModel] = useState("");
  const [inlineYear, setInlineYear] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    api.get("/vehicles").then((r) => {
      const list: Vehicle[] = r.data;
      setVehicles(list);
      if (list.length > 0) setSelectedVehicleId(list[0].id);
    }).catch(() => {});
  }, []);

  const vehicleReady = vehicles.length > 0
    ? !!selectedVehicleId
    : !!(inlineMake && inlineModel && inlineYear);

  async function registerInlineVehicle(): Promise<string | null> {
    setRegistering(true);
    try {
      const res = await api.post("/vehicles", {
        make: inlineMake,
        model: inlineModel,
        year: Number(inlineYear),
      });
      const newVehicle: Vehicle = res.data;
      setVehicles([newVehicle]);
      setSelectedVehicleId(newVehicle.id);
      return newVehicle.id;
    } catch {
      toast.error("Could not register vehicle. Please try again.");
      return null;
    } finally {
      setRegistering(false);
    }
  }

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

    let vehicleId = selectedVehicleId;

    if (!vehicleId) {
      if (!inlineMake || !inlineModel || !inlineYear) {
        toast.error("Please select your vehicle details first.");
        return;
      }
      const id = await registerInlineVehicle();
      if (!id) return;
      vehicleId = id;
    }

    setStep("detecting");
    try {
      const createRes = await api.post("/scans", { vehicleId });
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

  const inlineModels = inlineMake ? PAKISTAN_CARS[inlineMake] ?? [] : [];

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
          <CardContent className="space-y-5">
            {/* Vehicle selection — required */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Car className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Vehicle <span className="text-destructive">*</span></Label>
              </div>

              {vehicles.length > 0 ? (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} {v.year}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">No vehicles registered. Add your vehicle details to continue.</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Make</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                        value={inlineMake}
                        onChange={(e) => { setInlineMake(e.target.value); setInlineModel(""); }}
                      >
                        <option value="">Select make</option>
                        {PAKISTAN_CAR_MAKES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Model</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                        value={inlineModel}
                        onChange={(e) => setInlineModel(e.target.value)}
                        disabled={!inlineMake}
                      >
                        <option value="">Select model</option>
                        {inlineModels.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Year</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                        value={inlineYear}
                        onChange={(e) => setInlineYear(e.target.value)}
                      >
                        <option value="">Year</option>
                        {VEHICLE_YEARS.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Image upload */}
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
              disabled={files.length === 0 || !vehicleReady || step === "detecting" || registering}
            >
              {step === "detecting" || registering ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {registering ? "Registering vehicle..." : "Detecting damage..."}</>
              ) : (
                <><Zap className="w-4 h-4" /> Detect Damage</>
              )}
            </Button>

            {!vehicleReady && files.length > 0 && (
              <p className="text-xs text-center text-muted-foreground">Select your vehicle details above to continue.</p>
            )}
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
              {(scan.detectedParts ?? []).length} damaged part{(scan.detectedParts ?? []).length !== 1 ? "s" : ""} identified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(scan.detectedParts ?? []).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No damage detected in the uploaded images.</p>
            ) : (
              (scan.detectedParts ?? []).map((part) => (
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
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Estimated Cost</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(Number(scan.costEstimate.totalMin))} – {formatCurrency(Number(scan.costEstimate.totalMax))}
              </p>
            </div>

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
