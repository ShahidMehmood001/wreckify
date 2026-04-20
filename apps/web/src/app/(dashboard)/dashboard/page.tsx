"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, Car, FileText, Zap, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { formatDate, scanStatusColor } from "@/lib/utils";
import type { Scan, Subscription } from "@/types";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [scans, setScans] = useState<Scan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/scans").then((r) => setScans(r.data.slice(0, 5))),
      api.get("/users/subscription").then((r) => setSubscription(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const scansUsed = subscription?.scansUsed ?? 0;
  const scansTotal = subscription?.plan?.scansPerMonth ?? 3;
  const planName = subscription?.plan?.displayName ?? "Free";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your assessment overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scans Used</CardTitle>
            <ScanLine className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scansUsed}<span className="text-muted-foreground text-lg font-normal">/{scansTotal}</span></div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min((scansUsed / scansTotal) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month · {planName} plan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Scans</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scans.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime assessments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Your Plan</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{planName}</div>
            <p className="text-xs text-muted-foreground mt-1">{scansTotal} scans/month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/scan">
          <Card className="border-primary/20 hover:border-primary hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary transition-colors">
                <Zap className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
              </div>
              <div>
                <p className="font-semibold">New Scan</p>
                <p className="text-sm text-muted-foreground">Upload & assess damage</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/vehicles">
          <Card className="hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">My Vehicles</p>
                <p className="text-sm text-muted-foreground">Manage your fleet</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports">
          <Card className="hover:shadow-md transition-all cursor-pointer group">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Reports</p>
                <p className="text-sm text-muted-foreground">Download PDF reports</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Scans */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Your last 5 assessments</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/scans">View all <ArrowRight className="w-3 h-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-12">
              <ScanLine className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No scans yet.</p>
              <Button asChild className="mt-4">
                <Link href="/scan">Start your first scan</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {scans.map((scan) => (
                <Link key={scan.id} href={`/scans/${scan.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                        <ScanLine className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {scan.vehicle ? `${scan.vehicle.make} ${scan.vehicle.model} ${scan.vehicle.year}` : "Unknown Vehicle"}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDate(scan.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge className={scanStatusColor(scan.status)}>{scan.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
