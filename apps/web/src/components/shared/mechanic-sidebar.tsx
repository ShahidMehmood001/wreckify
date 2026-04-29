"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, MessageSquare, Settings, LogOut, Zap, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

const navItems = [
  { href: "/mechanic", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/mechanic/inquiries", label: "Inquiries", icon: MessageSquare, exact: false },
  { href: "/mechanic/settings", label: "Settings", icon: Settings, exact: false },
];

export function MechanicSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    api.get("/users/profile").then((r) => setFirstName(r.data.profile?.firstName ?? null)).catch(() => {});
  }, []);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  const displayName = firstName ?? user?.email?.split("@")[0] ?? "Mechanic";

  return (
    <aside className="fixed left-0 top-0 h-full w-64 border-r bg-card flex flex-col z-30">
      <div className="p-6 border-b">
        <Link href="/mechanic" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Wreckify</span>
        </Link>
        <div className="flex items-center gap-1.5 mt-3">
          <Wrench className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Workshop Portal</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
            {displayName[0]?.toUpperCase() || "M"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground">Mechanic</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
