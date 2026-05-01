import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Search, PackageOpen, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const go = (to: string) => {
    if (!user) navigate({ to: "/auth", search: { redirect: to } as any });
    else navigate({ to });
  };

  const cards = [
    {
      title: "Report Lost Item",
      desc: "Lost something on campus? Submit details and we'll match it with found items.",
      icon: Search,
      to: "/lost",
      tone: "from-primary to-[oklch(0.72_0.16_240)]",
    },
    {
      title: "Report Found Item",
      desc: "Found a stray item? Help return it to its owner by submitting it here.",
      icon: PackageOpen,
      to: "/found",
      tone: "from-[oklch(0.7_0.15_160)] to-[oklch(0.78_0.13_180)]",
    },
    {
      title: "Claim / Verify",
      desc: "See your item in the listings? Submit a claim with proof of ownership.",
      icon: ShieldCheck,
      to: "/claim",
      tone: "from-[oklch(0.78_0.15_80)] to-[oklch(0.72_0.16_60)]",
    },
  ];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-soft)]">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Built for students, by students
          </div>
          <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Lost something?
            <br />
            <span className="bg-[image:var(--gradient-hero)] bg-clip-text text-transparent">
              We'll help you find it.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Foundly is your campus lost-and-found hub. Report items, browse listings,
            and reunite with your belongings — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" onClick={() => go("/lost")} className="shadow-[var(--shadow-soft)]">
              Report a Lost Item <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => go("/found")}>
              I Found Something
            </Button>
          </div>
        </section>

        {/* Action cards */}
        <section className="grid gap-6 pb-20 md:grid-cols-3">
          {cards.map((c) => (
            <button
              key={c.to}
              onClick={() => go(c.to)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
            >
              <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.tone} text-white shadow-md`}>
                <c.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </section>

        {/* Browse */}
        <section className="pb-20 text-center">
          <Link to="/browse" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            Browse all reported items <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-border bg-card/40 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Foundly. Reuniting students with their stuff.
      </footer>
    </div>
  );
}
