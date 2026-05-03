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
    if (requireAuth && !user) navigate({ to: "/auth", search: { redirect: "/" } });
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
      <footer className="border-t border-border bg-card/40 py-6 text-center text-sm text-muted-foreground">
        <div className="mx-auto max-w-5xl space-y-1 px-4">
          <p>© {new Date().getFullYear()} Foundly. Reuniting students with their stuff.</p>
          <p className="text-xs">
            <span className="font-semibold text-foreground/80">Credits:</span>{" "}
            Developed by TQM Group 1 — School Project for Campus Use
          </p>
        </div>
      </footer>
    </div>
  );
}
