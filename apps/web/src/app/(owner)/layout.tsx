"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { OwnerSidebar } from "@/components/shared/owner-sidebar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (user?.role !== "OWNER") router.replace("/login");
  }, [isAuthenticated, user, _hasHydrated, router]);

  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "OWNER") return null;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <OwnerSidebar />
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
