"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, User, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

const profileSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  phone: z.string().optional(),
  city: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

export default function AdminSettingsPage() {
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState<ProfileData | null>(null);

  const profileForm = useForm<ProfileData>({ resolver: zodResolver(profileSchema) });

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
  }, []);

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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account information</p>
      </div>

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
    </div>
  );
}
