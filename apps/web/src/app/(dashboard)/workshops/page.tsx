"use client";
import { useEffect, useState } from "react";
import { Building2, MapPin, Phone, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Workshop } from "@/types";

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/workshops").then((r) => setWorkshops(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = workshops.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workshops</h1>
        <p className="text-muted-foreground mt-1">Find verified repair workshops near you</p>
      </div>

      <div className="relative">
        <Input
          placeholder="Search by name or city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-14 h-14 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">
            {search ? "No workshops found" : "No workshops available"}
          </h3>
          <p className="text-muted-foreground">
            {search ? "Try a different search term." : "Check back soon as more workshops join the network."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((w) => (
            <Card key={w.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base leading-tight">{w.name}</CardTitle>
                  {w.rating && (
                    <div className="flex items-center gap-1 text-amber-500 text-sm font-medium">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      {w.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {w.city}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {w.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {w.phone}
                  </p>
                )}
                {w.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{w.description}</p>
                )}
                {w.services && w.services.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {w.services.slice(0, 4).map((s) => (
                      <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>
                    ))}
                    {w.services.length > 4 && (
                      <Badge variant="outline" className="text-xs">+{w.services.length - 4} more</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
