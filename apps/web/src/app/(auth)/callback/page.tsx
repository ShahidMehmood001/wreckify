"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      router.replace("/login");
      return;
    }

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    function roleHome(role: string) {
      if (role === "ADMIN") return "/admin";
      if (role === "MECHANIC") return "/mechanic";
      return "/dashboard";
    }

    api
      .get("/auth/me")
      .then((res) => {
        setAuth(res.data, accessToken, refreshToken);
        router.replace(roleHome(res.data.role));
      })
      .catch(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        router.replace("/login");
      });
  }, []);

  return null;
}

export default function AuthCallbackPage() {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
      <Suspense>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
