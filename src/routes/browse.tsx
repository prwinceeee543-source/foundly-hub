import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { MapPin, Calendar, Package } from "lucide-react";

export const Route = createFileRoute("/browse")({
  head: () => ({ meta: [{ title: "Browse Items — Foundly" }] }),
  component: BrowsePage,
});

type Item = {
  id: string;
  type: string;
  item_name: string;
  description: string | null;
  date_time: string;
  brand: string | null;
  color: string | null;
  last_location: string | null;
  image_url: string | null;
  status: string;
};

function BrowsePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<"all" | "lost" | "found">("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmItem, setConfirmItem] = useState<Item | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data as Item[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = items.filter((i) => {
    if (filter !== "all" && i.type !== filter) return false;
    if (q && !`${i.item_name} ${i.description ?? ""} ${i.last_location ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const statusLabel = (s: string) => s === "unclaimed" ? "Available" : s === "pending" ? "Pending Approval" : s === "claimed" ? "Claimed" : s;
  const statusVariant = (s: string): "default" | "outline" | "destructive" | "secondary" =>
    s === "claimed" ? "default" : s === "pending" ? "secondary" : "outline";

  return (
    <PageShell title="Browse items" subtitle="All reported lost and found items.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
            <TabsTrigger value="found">Found</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search by name, location..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <Button variant="outline" onClick={() => navigate({ to: "/claim", search: { itemId: "" } })} className="sm:ml-auto">
          File a claim
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Package className="mx-auto mb-3 h-10 w-10 opacity-40" />
          No items yet.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <Card key={i.id} className="overflow-hidden shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-soft)]">
              {i.image_url ? (
                <img src={i.image_url} alt={i.item_name} className="h-40 w-full object-cover" />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-muted">
                  <Package className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{i.item_name}</h3>
                  <Badge variant={i.type === "lost" ? "destructive" : "default"}>
                    {i.type}
                  </Badge>
                </div>
                {i.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{i.description}</p>
                )}
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {i.last_location && (
                    <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{i.last_location}</div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(i.date_time), "PP p")}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant={statusVariant(i.status)} className="text-xs capitalize">{statusLabel(i.status)}</Badge>
                  {i.type === "found" && i.status === "unclaimed" && (
                    <Button size="sm" onClick={() => setConfirmItem(i)}>
                      Claim Item
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmItem} onOpenChange={(o) => !o && setConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Claim "{confirmItem?.item_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be asked to upload an ID and describe proof of ownership.
              An admin will review your request before the item is marked as claimed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const id = confirmItem?.id;
              setConfirmItem(null);
              if (id) navigate({ to: "/claim", search: { itemId: id } });
            }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
