"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, Building2, Pencil, Plus, X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { Workshop } from "@/types";

const workshopSchema = z.object({
  name: z.string().min(1, "Workshop name is required"),
  city: z.string().min(1, "City is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
});

type WorkshopFormData = z.infer<typeof workshopSchema>;

export default function WorkshopProfilePage() {
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedData, setSavedData] = useState<WorkshopFormData | null>(null);

  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");
  const [savingServices, setSavingServices] = useState(false);

  const form = useForm<WorkshopFormData>({ resolver: zodResolver(workshopSchema) });

  useEffect(() => {
    api
      .get("/workshops/my")
      .then((r) => {
        const w: Workshop = r.data;
        const data: WorkshopFormData = {
          name: w.name,
          city: w.city,
          address: w.address ?? "",
          phone: w.phone ?? "",
          description: w.description ?? "",
        };
        setSavedData(data);
        form.reset(data);
        setServices(w.services.map((s) => s.name));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(data: WorkshopFormData) {
    setSaving(true);
    try {
      await api.patch("/workshops/my", data);
      setSavedData(data);
      setEditing(false);
      toast.success("Workshop profile updated.");
    } catch {
      toast.error("Failed to update workshop profile.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    if (savedData) form.reset(savedData);
    setEditing(false);
  }

  function addService() {
    const trimmed = newService.trim();
    if (!trimmed || services.includes(trimmed)) return;
    setServices((prev) => [...prev, trimmed]);
    setNewService("");
  }

  function removeService(name: string) {
    setServices((prev) => prev.filter((s) => s !== name));
  }

  async function saveServices() {
    setSavingServices(true);
    try {
      await api.put("/workshops/my/services", { services });
      toast.success("Services updated.");
    } catch {
      toast.error("Failed to update services.");
    } finally {
      setSavingServices(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-10 w-56 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Workshop Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your workshop information</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No workshop registered</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              You haven&apos;t linked a workshop to your account yet.
            </p>
            <Button asChild>
              <Link href="/register/workshop">Register Workshop</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workshop Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your workshop information</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Workshop Details
            </CardTitle>
            <CardDescription>Name, location, and contact information</CardDescription>
          </div>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editing ? (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>Workshop Name *</Label>
                <Input {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input placeholder="Lahore" {...form.register("city")} />
                  {form.formState.errors.city && (
                    <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="+92 300 0000000" {...form.register("phone")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input placeholder="123 Main Street, Block A" {...form.register("address")} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Tell customers about your workshop"
                  {...form.register("description")}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs mb-1">Workshop Name</p>
                <p className="font-medium">{savedData?.name || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">City</p>
                <p className="font-medium">{savedData?.city || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Phone</p>
                <p className="font-medium">{savedData?.phone || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs mb-1">Address</p>
                <p className="font-medium">{savedData?.address || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs mb-1">Description</p>
                <p className="font-medium">{savedData?.description || "—"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" /> Services
          </CardTitle>
          <CardDescription>Services your workshop offers to customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services added yet.</p>
            ) : (
              services.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1.5 pr-1.5 text-sm">
                  {s}
                  <button
                    type="button"
                    onClick={() => removeService(s)}
                    className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Engine Repair"
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addService();
                }
              }}
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addService}
              disabled={!newService.trim()}
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <Button size="sm" onClick={saveServices} disabled={savingServices}>
            {savingServices && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Save Services
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
