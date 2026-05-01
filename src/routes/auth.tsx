import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: (s.redirect as string) || "/",
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = Route.useSearch();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: search.redirect || "/" });
  }, [user, navigate, search.redirect]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: fd.get("email") as string,
      password: fd.get("password") as string,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fd.get("full_name") as string,
          student_id: fd.get("student_id") as string,
          contact_number: fd.get("contact_number") as string,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you're signed in!");
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-soft)] flex flex-col">
      <div className="mx-auto max-w-md w-full flex-1 flex flex-col justify-center p-6">
        <Link to="/" className="mb-6 flex items-center gap-2 self-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-soft)]">
            <Search className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold">Foundly</span>
        </Link>

        <Card className="p-6 shadow-[var(--shadow-soft)]">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="li-pw">Password</Label>
                  <Input id="li-pw" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Admin? Use <code className="rounded bg-muted px-1">admin@foundly.app</code> / <code className="rounded bg-muted px-1">admin123</code>
                </p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3 mt-4">
                <div>
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" name="full_name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="su-sid">Student ID</Label>
                    <Input id="su-sid" name="student_id" required />
                  </div>
                  <div>
                    <Label htmlFor="su-tel">Contact #</Label>
                    <Input id="su-tel" name="contact_number" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div>
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" name="password" type="password" required minLength={6} autoComplete="new-password" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
