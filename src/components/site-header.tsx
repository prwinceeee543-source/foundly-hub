import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Search, LogOut, ShieldCheck } from "lucide-react";

export function SiteHeader() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-soft)]">
            <Search className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Foundly</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              {user && (
                <Button
                  size="sm"
                  onClick={() => navigate({ to: "/admin" })}
                  className="bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 font-semibold"
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  Admin Dashboard
                </Button>
              )}
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/auth", search: { redirect: "/" } })}>
              Sign in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}