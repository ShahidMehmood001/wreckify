"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, User, Key, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Subscription } from "@/types";

const profileSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  phone: z.string().optional(),
  city: z.string().optional(),
});

const aiSchema = z.object({
  provider: z.enum(["GEMINI", "OPENAI", "ZHIPU"]),
  apiKey: z.string().min(1, "API Key required"),
  model: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;
type AIData = z.infer<typeof aiSchema>;

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAI, setSavingAI] = useState(false);

  const profileForm = useForm<ProfileData>({ resolver: zodResolver(profileSchema) });
  const aiForm = useForm<AIData>({
    resolver: zodResolver(aiSchema),
    defaultValues: { provider: "GEMINI" },
  });

  useEffect(() => {
    api.get("/users/profile").then((r) => {
      profileForm.reset({
        firstName: r.data.firstName || "",
        lastName: r.data.lastName || "",
        phone: r.data.phone || "",
        city: r.data.city || "",
      });
    });
    api.get("/users/subscription").then((r) => setSubscription(r.data)).catch(() => {});
  }, []);

  async function onProfileSubmit(data: ProfileData) {
    setSavingProfile(true);
    try {
      await api.patch("/users/profile", data);
      toast.success("Profile updated.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onAISubmit(data: AIData) {
    setSavingAI(true);
    try {
      await api.patch("/users/ai-config", data);
      toast.success("AI configuration saved.");
      aiForm.setValue("apiKey", "");
    } catch {
      toast.error("Failed to save AI config.");
    } finally {
      setSavingAI(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Subscription */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Plan</span>
              <Badge className="bg-primary text-white">{subscription.plan.displayName}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Scans This Month</span>
              <span className="text-sm text-muted-foreground">
                {subscription.scansUsed} / {subscription.plan.scansPerMonth}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.min((subscription.scansUsed / subscription.plan.scansPerMonth) * 100, 100)}%` }}
              />
            </div>
            {subscription.plan.name === "FREE" && (
              <p className="text-xs text-muted-foreground">
                Upgrade to PRO for unlimited scans and priority AI processing.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input {...profileForm.register("firstName")} />
                {profileForm.formState.errors.firstName && (
                  <p className="text-xs text-destructive">{profileForm.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input {...profileForm.register("lastName")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+92 300 0000000" {...profileForm.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input placeholder="Lahore" {...profileForm.register("city")} />
              </div>
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* AI Config (BYOK) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5" /> AI Provider (BYOK)</CardTitle>
          <CardDescription>
            Bring your own API key for higher rate limits. Keys are encrypted with AES-256.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={aiForm.handleSubmit(onAISubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={aiForm.watch("provider")}
                onValueChange={(v) => aiForm.setValue("provider", v as AIData["provider"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GEMINI">Google Gemini (Free tier available)</SelectItem>
                  <SelectItem value="OPENAI">OpenAI GPT-4</SelectItem>
                  <SelectItem value="ZHIPU">ZhipuAI GLM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input type="password" placeholder="Enter your API key" {...aiForm.register("apiKey")} />
              {aiForm.formState.errors.apiKey && (
                <p className="text-xs text-destructive">{aiForm.formState.errors.apiKey.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Model <span className="text-muted-foreground">(optional)</span></Label>
              <Input placeholder="e.g. gemini-1.5-pro" {...aiForm.register("model")} />
            </div>
            <Button type="submit" disabled={savingAI}>
              {savingAI && <Loader2 className="w-4 h-4 animate-spin" />}
              Save AI Config
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
