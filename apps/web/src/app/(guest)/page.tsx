import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Shield, Clock, TrendingUp, Camera, DollarSign, FileText, Building2 } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "AI Damage Detection",
    desc: "Upload photos of your vehicle and our YOLOv8-powered AI identifies all damaged parts instantly.",
  },
  {
    icon: DollarSign,
    title: "Cost Estimation",
    desc: "Get accurate repair cost estimates in PKR with parts and labour breakdown from real market data.",
  },
  {
    icon: FileText,
    title: "Professional Reports",
    desc: "Generate PDF reports for insurance claims or workshop assessments in seconds.",
  },
  {
    icon: Building2,
    title: "Workshop Network",
    desc: "Connect with verified workshops across Pakistan for repair quotes and bookings.",
  },
];

const stats = [
  { value: "99%", label: "Detection Accuracy" },
  { value: "< 30s", label: "Assessment Time" },
  { value: "500+", label: "Part Prices Tracked" },
  { value: "24/7", label: "Available" },
];

export default function LandingPage() {
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
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started Free</Link>
            </Button>
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
          Upload a photo of your damaged vehicle and get an instant AI-generated damage report with accurate repair cost
          estimates in Pakistani Rupees.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="text-base px-8">
            <Link href="/register">Start Free Assessment</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base px-8">
            <Link href="/login">View Demo</Link>
          </Button>
        </div>

        {/* Stats */}
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
          <div className="grid md:grid-cols-3 gap-8 relative">
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

      {/* CTA */}
      <section className="bg-primary py-20">
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to assess your vehicle?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Join thousands of vehicle owners getting fast, accurate damage assessments.
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
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Wreckify. AI-powered vehicle assessment for Pakistan.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/register" className="hover:text-foreground">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
