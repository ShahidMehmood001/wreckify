"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Zap, Shield, Clock, TrendingUp, Camera, DollarSign, FileText,
  Building2, Upload, Loader2, AlertTriangle, CheckCircle2, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { DetectedPart } from "@/types";

type ScanStep = "idle" | "uploading" | "detecting" | "done" | "limit-reached" | "error";

const severityColor: Record<string, string> = {
  MINOR: "bg-yellow-100 text-yellow-800",
  MODERATE: "bg-orange-100 text-orange-800",
  SEVERE: "bg-red-100 text-red-800",
};

const features = [
  { icon: Camera, title: "AI Damage Detection", desc: "YOLOv8-powered AI identifies all damaged parts instantly with confidence scores." },
  { icon: DollarSign, title: "Cost Estimation", desc: "Accurate repair cost estimates in PKR with parts and labour breakdown from real market data." },
  { icon: FileText, title: "Professional Reports", desc: "Generate PDF reports for insurance claims or workshop assessments in seconds." },
  { icon: Building2, title: "Workshop Network", desc: "Connect with verified workshops across Pakistan for repair quotes and bookings." },
];

const stats = [
  { value: "99%", label: "Detection Accuracy" },
  { value: "< 30s", label: "Assessment Time" },
  { value: "500+", label: "Part Prices Tracked" },
  { value: "24/7", label: "Available" },
];

function getOrCreateGuestSessionId(): string {
  const key = "wreckify_guest_session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function LandingPage() {
  const [step, setStep] = useState<ScanStep>("idle");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [detectedParts, setDetectedParts] = useState<DetectedPart[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => previewUrls.forEach(URL.revokeObjectURL);
  }, [previewUrls]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 5);
    setSelectedFiles(valid);
    setPreviewUrls(valid.map((f) => URL.createObjectURL(f)));
  }

  async function runScan() {
    if (selectedFiles.length === 0) return;

    const guestSessionId = getOrCreateGuestSessionId();
    setStep("uploading");
    setErrorMessage("");

    let scanId: string;

    try {
      const createRes = await api.post("/scans/guest", { guestSessionId });
      scanId = createRes.data.id;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "";
      if (err?.response?.status === 403 || msg.toLowerCase().includes("limit")) {
        setStep("limit-reached");
      } else {
        setErrorMessage("Failed to start scan. Please try again.");
        setStep("error");
      }
      return;
    }

    try {
      const form = new FormData();
      form.append("guestSessionId", guestSessionId);
      selectedFiles.forEach((f) => form.append("images", f));
      await api.post(`/scans/${scanId}/images/guest`, form);
    } catch {
      setErrorMessage("Failed to upload images. Please try again.");
      setStep("error");
      return;
    }

    setStep("detecting");

    try {
      const detectRes = await api.post(`/scans/${scanId}/detect/guest`, { guestSessionId });
      setDetectedParts(detectRes.data.detectedParts ?? []);
      setStep("done");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setErrorMessage("AI detection failed. Please try again with a clearer photo.");
      setStep("error");
    }
  }

  function reset() {
    setStep("idle");
    setSelectedFiles([]);
    setPreviewUrls([]);
    setDetectedParts([]);
    setErrorMessage("");
  }

  const isProcessing = step === "uploading" || step === "detecting";

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="border-b sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Wreckify</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#try-it" className="hover:text-foreground transition-colors">Try it free</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link href="/login">Sign in</Link></Button>
            <Button asChild><Link href="/register">Get Started Free</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          AI-Powered Vehicle Assessment for Pakistan
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-tight">
          Assess Vehicle Damage in{" "}
          <span className="text-primary">Seconds</span>, Not Hours
        </h1>
        <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
          Upload a photo of your damaged vehicle and get an instant AI-generated damage report with accurate repair cost estimates in Pakistani Rupees.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="text-base px-8" onClick={() => document.getElementById("try-it")?.scrollIntoView({ behavior: "smooth" })}>
            Try Free — No Sign Up
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base px-8">
            <Link href="/register">Create Free Account</Link>
          </Button>
        </div>
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-4xl font-bold text-primary">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/40 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Everything you need for vehicle assessment</h2>
            <p className="mt-4 text-muted-foreground text-lg">One platform for detection, estimation, and reporting.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How Wreckify works</h2>
            <p className="mt-4 text-muted-foreground text-lg">Three steps to a complete damage assessment.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: Camera, title: "Upload Photos", desc: "Take photos of your damaged vehicle from multiple angles and upload them to Wreckify." },
              { step: "02", icon: Shield, title: "AI Detection", desc: "Our YOLOv8 model identifies all damaged parts with confidence scores and severity levels." },
              { step: "03", icon: TrendingUp, title: "Get Estimate", desc: "Receive a detailed cost breakdown in PKR with parts prices and labour costs." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-xs font-bold text-primary mb-2">STEP {step}</div>
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Try it — Guest Scan */}
      <section id="try-it" className="bg-muted/40 py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Try it right now — no sign-up required</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Upload one photo and see AI damage detection in action. Free, instant, no account needed.
            </p>
          </div>

          <Card className="shadow-md">
            <CardContent className="pt-6 space-y-6">

              {/* Idle / upload area */}
              {(step === "idle" || step === "error") && (
                <>
                  <div
                    className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                  >
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">Drop your vehicle photo here</p>
                    <p className="text-sm text-muted-foreground mt-1">or click to browse — JPG, PNG up to 10 MB</p>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                  </div>

                  {previewUrls.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {previewUrls.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-md border" />
                      ))}
                    </div>
                  )}

                  {step === "error" && (
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  <Button className="w-full gap-2" size="lg" disabled={selectedFiles.length === 0} onClick={runScan}>
                    <Zap className="w-4 h-4" /> Analyse Damage
                  </Button>
                </>
              )}

              {/* Processing */}
              {isProcessing && (
                <div className="text-center py-10 space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                  <p className="font-medium text-lg">
                    {step === "uploading" ? "Uploading images…" : "AI is analysing damage…"}
                  </p>
                  <p className="text-sm text-muted-foreground">This usually takes 10–30 seconds.</p>
                </div>
              )}

              {/* Limit reached */}
              {step === "limit-reached" && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-7 h-7 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold">You&apos;ve used your free guest scan</h3>
                  <p className="text-muted-foreground">Create a free account to get 3 scans per month, save your reports, and access cost estimates.</p>
                  <div className="flex gap-3 justify-center pt-2">
                    <Button asChild size="lg"><Link href="/register">Create Free Account</Link></Button>
                    <Button variant="outline" onClick={reset}>Start over</Button>
                  </div>
                </div>
              )}

              {/* Results */}
              {step === "done" && (
                <div ref={resultsRef} className="space-y-5">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Detection complete — {detectedParts.length} damaged part{detectedParts.length !== 1 ? "s" : ""} found</span>
                  </div>

                  {detectedParts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No damage detected. Try uploading a clearer or closer photo of the affected area.</p>
                  ) : (
                    <div className="space-y-2">
                      {detectedParts.map((part) => (
                        <div key={part.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="text-sm font-medium capitalize">{part.partName.replace(/_/g, " ")}</p>
                            {part.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{part.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground">{Math.round(part.confidenceScore * 100)}%</span>
                            <Badge className={`text-xs ${severityColor[part.severity] ?? ""}`}>
                              {part.severity}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Register CTA */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-5 space-y-3">
                    <p className="font-semibold">Want the full report with cost estimates?</p>
                    <p className="text-sm text-muted-foreground">
                      Register for free to unlock PKR repair cost breakdowns, PDF reports, and 3 scans every month.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button asChild className="gap-1.5">
                        <Link href="/register">Create Free Account <ChevronRight className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={reset}>Scan another photo</Button>
                    </div>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready for the full assessment?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Create a free account and get 3 full scans per month — including cost estimates and PDF reports.
          </p>
          <Button size="lg" variant="secondary" asChild className="text-base px-10">
            <Link href="/register">Create Free Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Wreckify</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Wreckify. AI-powered vehicle assessment for Pakistan.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/register" className="hover:text-foreground">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
