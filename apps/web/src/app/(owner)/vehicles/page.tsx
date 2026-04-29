"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Car, Plus, Trash2, Loader2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { Vehicle } from "@/types";

const schema = z.object({
  make: z.string().min(1, "Required"),
  model: z.string().min(1, "Required"),
  year: z.coerce.number().min(1950).max(new Date().getFullYear() + 1),
  color: z.string().optional(),
  registrationNo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function VehicleForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<FormData>;
  onSubmit: (d: FormData) => Promise<void>;
  loading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Make</Label>
          <Input placeholder="Toyota" {...register("make")} />
          {errors.make && <p className="text-xs text-destructive">{errors.make.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Model</Label>
          <Input placeholder="Corolla" {...register("model")} />
          {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Year</Label>
          <Input type="number" placeholder="2020" {...register("year")} />
          {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Color <span className="text-muted-foreground">(optional)</span></Label>
          <Input placeholder="White" {...register("color")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Registration No. <span className="text-muted-foreground">(optional)</span></Label>
        <Input placeholder="LHR-1234" {...register("registrationNo")} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Save Vehicle
      </Button>
    </form>
  );
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    api.get("/vehicles").then((r) => setVehicles(r.data)).finally(() => setLoading(false));
  }, []);

  async function handleAdd(data: FormData) {
    setSaving(true);
    try {
      const res = await api.post("/vehicles", data);
      setVehicles((prev) => [...prev, res.data]);
      setAddOpen(false);
      toast.success("Vehicle added.");
    } catch {
      toast.error("Failed to add vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(data: FormData) {
    if (!editVehicle) return;
    setSaving(true);
    try {
      const res = await api.patch(`/vehicles/${editVehicle.id}`, data);
      setVehicles((prev) => prev.map((v) => (v.id === editVehicle.id ? res.data : v)));
      setEditVehicle(null);
      toast.success("Vehicle updated.");
    } catch {
      toast.error("Failed to update vehicle.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/vehicles/${id}`);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      toast.success("Vehicle removed.");
    } catch {
      toast.error("Failed to delete vehicle.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Vehicles</h1>
          <p className="text-muted-foreground mt-1">Manage your vehicle fleet</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" /> Add Vehicle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
            <VehicleForm onSubmit={handleAdd} loading={saving} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Car className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No vehicles yet</h3>
            <p className="text-muted-foreground mb-6">Add your vehicles to link them to damage scans.</p>
            <Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add your first vehicle</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Card key={v.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditVehicle(v)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{v.make} {v.model}</CardTitle>
                <CardDescription>{v.year}{v.color ? ` · ${v.color}` : ""}</CardDescription>
              </CardHeader>
              {v.registrationNo && (
                <CardContent className="pt-0">
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{v.registrationNo}</span>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editVehicle} onOpenChange={(o) => !o && setEditVehicle(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Vehicle</DialogTitle></DialogHeader>
          {editVehicle && (
            <VehicleForm
              defaultValues={editVehicle}
              onSubmit={handleEdit}
              loading={saving}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
