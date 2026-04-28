"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, User, Key, CreditCard, Lock, Pencil } from "lucide-react";
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
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;
type AIData = z.infer<typeof aiSchema>;

interface AIConfig {
  provider: "GEMINI" | "OPENAI" | "ZHIPU" | null;
  model: string | null;
  hasKey: boolean;
}

export default function SettingsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAI, setSavingAI] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState<ProfileData | null>(null);

  const profileForm = useForm<ProfileData>({ resolver: zodResolver(profileSchema) });
  const aiForm = useForm<AIData>({
    resolver: zodResolver(aiSchema),
    defaultValues: { provider: "GEMINI" },
  });

  useEffect(() => {
    api.get("/users/profile").then((r) => {
      const profile = {
        firstName: r.data.profile?.firstName || "",
        lastName: r.data.profile?.lastName || "",
        phone: r.data.profile?.phone || "",
        city: r.data.profile?.city || "",
      };
      setSavedProfile(profile);
      profileForm.reset(profile);
    });
    api.get("/users/subscription").then((r) => setSubscription(r.data)).catch(() => {});
    api.get("/users/ai-config").then((r) => setAiConfig(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (aiConfig) {
      aiForm.reset({
        provider: aiConfig.provider ?? "GEMINI",
        model: aiConfig.model ?? "",
        apiKey: "",
      });
    }
  }, [aiConfig]);

  async function onProfileSubmit(data: ProfileData) {
    setSavingProfile(true);
    try {
      await api.patch("/users/profile", data);
      setSavedProfile(data);
      setEditingProfile(false);
      toast.success("Profile updated.");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  function cancelProfileEdit() {
    if (savedProfile) profileForm.reset(savedProfile);
    setEditingProfile(false);
  }

  async function onAISubmit(data: AIData) {
    setSavingAI(true);
    try {
      await api.patch("/users/ai-config", data);
      toast.success("AI configuration saved.");
      setAiConfig((prev) => ({
        provider: data.provider,
        model: data.model ?? prev?.model ?? null,
        hasKey: true,
      }));
      aiForm.setValue("apiKey", "");
    } catch {
      toast.error("Failed to save AI config.");
    } finally {
      setSavingAI(false);
    }
  }

  const isFreePlan = subscription?.plan?.name === "FREE";

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
                {subscription.plan.scansPerMonth === -1
                  ? `${subscription.scansUsed} (Unlimited)`
                  : `${subscription.scansUsed} / ${subscription.plan.scansPerMonth}`}
              </span>
            </div>
            {subscription.plan.scansPerMonth !== -1 && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.min((subscription.scansUsed / subscription.plan.scansPerMonth) * 100, 100)}%` }}
                />
              </div>
            )}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </div>
          {!editingProfile && (
            <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingProfile ? (
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
              <div className="flex gap-2">
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={cancelProfileEdit} disabled={savingProfile}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : savedProfile && (savedProfile.firstName || savedProfile.lastName || savedProfile.phone || savedProfile.city) ? (
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">First Name</p>
                <p className="font-medium">{savedProfile.firstName || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Last Name</p>
                <p className="font-medium">{savedProfile.lastName || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Phone</p>
                <p className="font-medium">{savedProfile.phone || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">City</p>
                <p className="font-medium">{savedProfile.city || "—"}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No profile info added yet. Click Edit to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* AI Config (BYOK) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Custom AI Provider
            <span className="text-xs text-muted-foreground font-normal">(BYOK)</span>
          </CardTitle>
          <CardDescription>
            Connect your own AI account for higher rate limits and priority processing. Your key is encrypted and never shared.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFreePlan ? (
            <div className="text-center py-8 space-y-3">
              <Lock className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-medium">Available on Pro and above</p>
              <p className="text-sm text-muted-foreground">
                Upgrade your plan to connect your own AI provider and get higher scan limits.
              </p>
              <Button variant="outline" size="sm" disabled>Upgrade Plan</Button>
            </div>
          ) : (
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
                {aiConfig?.hasKey && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 mb-1">
                    API key configured ✓
                  </Badge>
                )}
                <Label>{aiConfig?.hasKey ? "New API Key" : "API Key"}</Label>
                <Input
                  type="password"
                  placeholder={aiConfig?.hasKey ? "Enter new key to replace existing" : "Enter your API key"}
                  {...aiForm.register("apiKey")}
                />
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
