import { ReactNode, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";

export function PageShell({
  children,
  title,
  subtitle,
  requireAuth = true,
  requireAdmin = false,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}) {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (requireAuth && !user) navigate({ to: "/auth" });
    if (requireAdmin && role && role !== "admin") navigate({ to: "/" });
  }, [user, role, loading, requireAuth, requireAdmin, navigate]);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-soft)]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
