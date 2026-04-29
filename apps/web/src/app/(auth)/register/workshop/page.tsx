"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  workshopName: string;
  city: string;
  address: string;
  phone: string;
}

interface FieldError {
  [key: string]: string;
}

function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {([1, 2] as const).map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          {i > 0 && (
            <div className={`h-px w-10 transition-colors ${current >= step ? "bg-primary" : "bg-border"}`} />
          )}
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
            current === step
              ? "bg-primary text-primary-foreground"
              : current > step
              ? "bg-primary/20 text-primary"
              : "bg-muted text-muted-foreground"
          }`}>
            {step}
          </div>
        </div>
      ))}
      <span className="ml-1 text-xs text-muted-foreground">Step {current} of 2</span>
    </div>
  );
}

function roleHome(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "MECHANIC") return "/mechanic";
  return "/dashboard";
}

export default function RegisterWorkshopPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});

  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    workshopName: "",
    city: "",
    address: "",
    phone: "",
  });

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  }

  function validateStep1(): boolean {
    const errs: FieldError = {};
    if (form.firstName.trim().length < 2) errs.firstName = "First name required (min 2 characters)";
    if (form.lastName.trim().length < 2) errs.lastName = "Last name required (min 2 characters)";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    const errs: FieldError = {};
    if (!form.workshopName.trim()) errs.workshopName = "Workshop name is required";
    if (!form.city.trim()) errs.city = "City is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (validateStep1()) setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        workshopName: form.workshopName.trim(),
        city: form.city.trim(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
      };
      const res = await api.post("/auth/register/workshop", payload);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success("Workshop registered! Pending admin approval.");
      router.push(roleHome(res.data.user.role));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <StepIndicator current={step} />
        <CardTitle className="text-2xl">
          {step === 1 ? "Your details" : "Workshop details"}
        </CardTitle>
        <CardDescription>
          {step === 1
            ? "Tell us about yourself to create your account."
            : "Tell us about your workshop. You can update this later."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  placeholder="Ali"
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Khan"
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ali@example.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  className="pr-10"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <Button type="button" className="w-full" onClick={handleNext}>
              Continue →
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workshopName">Workshop name</Label>
              <Input
                id="workshopName"
                placeholder="Khan Auto Works"
                value={form.workshopName}
                onChange={(e) => set("workshopName", e.target.value)}
              />
              {errors.workshopName && <p className="text-sm text-destructive">{errors.workshopName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Lahore"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
              {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">
                Address <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="address"
                placeholder="12-B, Main Boulevard, Gulberg"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="phone"
                placeholder="+92-300-1234567"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-1"
                onClick={() => { setErrors({}); setStep(1); }}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Register Workshop
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
