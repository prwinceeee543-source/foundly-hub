import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Package, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Foundly" }] }),
  component: AdminPage,
});

type Item = {
  id: string; type: string; item_name: string; description: string | null;
  date_time: string; image_url: string | null; status: string; last_location: string | null;
  user_id: string;
};
type Claim = {
  id: string; item_id: string; user_id: string; proof_description: string;
  digital_signature: string; status: string; id_image_url: string | null; created_at: string;
  proof_image_url: string | null;
  claimed_item_name: string | null;
  claimed_item_description: string | null;
  items?: { item_name: string } | null;
  profiles?: { full_name: string | null; email: string | null; student_id: string | null } | null;
  id_signed_url?: string | null;
  proof_signed_url?: string | null;
};

function AdminPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [q, setQ] = useState("");
  const [pendingAction, setPendingAction] = useState<
    | { kind: "claim"; status: "approved" | "rejected"; id: string; itemId: string; name: string }
    | { kind: "deleteItem"; id: string; name: string }
    | null
  >(null);

  const refresh = async () => {
    const [it, cl] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase
        .from("claims")
        .select("*, items(item_name)")
        .order("created_at", { ascending: false }),
    ]);
    setItems((it.data as Item[]) ?? []);
    const claimsData = (cl.data as any[]) ?? [];
    // Fetch profiles separately (no FK between claims.user_id and profiles)
    const userIds = [...new Set(claimsData.map((c) => c.user_id))];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, student_id")
        .in("id", userIds);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      claimsData.forEach((c) => { c.profiles = map.get(c.user_id) ?? null; });
    }
    // Generate signed URLs for ID and proof images (private buckets)
    await Promise.all(claimsData.map(async (c) => {
      if (c.id_image_url) {
        const { data } = await supabase.storage.from("claim-ids").createSignedUrl(c.id_image_url, 3600);
        c.id_signed_url = data?.signedUrl ?? null;
      }
      if (c.proof_image_url) {
        const { data } = await supabase.storage.from("claim-proofs").createSignedUrl(c.proof_image_url, 3600);
        c.proof_signed_url = data?.signedUrl ?? null;
      }
    }));
    setClaims(claimsData);
  };

  useEffect(() => { refresh(); }, []);

  const updateClaim = async (id: string, status: "approved" | "rejected", itemId: string) => {
    const { error } = await supabase.from("claims").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    if (itemId) {
      if (status === "approved") {
        await supabase.from("items").update({ status: "claimed" }).eq("id", itemId);
      } else {
        await supabase.from("items").update({ status: "unclaimed" }).eq("id", itemId);
      }
    }
    toast.success(status === "approved" ? "Claim approved — item marked as claimed" : "Claim rejected — item is available again");
    refresh();
  };

  const updateItemStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("items").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    refresh();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("claims").delete().eq("item_id", id);
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Item deleted");
    refresh();
  };

  const statusLabel = (s: string) => s === "unclaimed" ? "Available" : s === "pending" ? "Pending Approval" : s === "claimed" ? "Claimed" : s;

  const filteredItems = items.filter((i) =>
    !q || `${i.item_name} ${i.last_location ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <PageShell title="Admin dashboard" subtitle="Manage items and review claims." requireAdmin>
      <Tabs defaultValue="claims">
        <TabsList>
          <TabsTrigger value="claims">Claims ({claims.filter(c => c.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="claims" className="mt-6 space-y-4">
          {claims.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">No claims yet.</Card>
          ) : claims.map((c) => (
            <Card key={c.id} className="p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {c.claimed_item_name ?? c.items?.item_name ?? "Item"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {c.profiles?.full_name} · {c.profiles?.student_id} · {c.profiles?.email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{format(new Date(c.created_at), "PP p")}</p>
                </div>
                <Badge variant={c.status === "pending" ? "outline" : c.status === "approved" ? "default" : "destructive"}>
                  {c.status}
                </Badge>
              </div>
              {c.claimed_item_description && (
                <p className="mt-3 text-sm"><strong>Description:</strong> {c.claimed_item_description}</p>
              )}
              <p className="mt-2 text-sm"><strong>Proof of ownership:</strong> {c.proof_description}</p>
              <p className="mt-1 text-sm"><strong>Signed:</strong> <em>{c.digital_signature}</em></p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {c.id_signed_url && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Valid ID</p>
                    <a href={c.id_signed_url} target="_blank" rel="noreferrer">
                      <img src={c.id_signed_url} alt="Submitted ID" className="h-40 w-full rounded-md border object-cover" />
                    </a>
                  </div>
                )}
                {c.proof_signed_url && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Proof of ownership photo</p>
                    <a href={c.proof_signed_url} target="_blank" rel="noreferrer">
                      <img src={c.proof_signed_url} alt="Ownership proof" className="h-40 w-full rounded-md border object-cover" />
                    </a>
                  </div>
                )}
              </div>
              {c.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => setPendingAction({ kind: "claim", status: "approved", id: c.id, itemId: c.item_id, name: c.items?.item_name ?? "this item" })}>
                    <Check className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPendingAction({ kind: "claim", status: "rejected", id: c.id, itemId: c.item_id, name: c.items?.item_name ?? "this item" })}>
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="items" className="mt-6 space-y-4">
          <Input placeholder="Search items..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          {filteredItems.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <Package className="mx-auto mb-3 h-10 w-10 opacity-40" /> No items.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((i) => (
                <Card key={i.id} className="overflow-hidden">
                  {i.image_url && <img src={i.image_url} alt="" className="h-32 w-full object-cover" />}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{i.item_name}</h4>
                      <Badge variant={i.type === "lost" ? "destructive" : "default"}>{i.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{i.last_location}</p>
                    <Select value={i.status} onValueChange={(v) => updateItemStatus(i.id, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unclaimed">Available</SelectItem>
                        <SelectItem value="pending">Pending Approval</SelectItem>
                        <SelectItem value="claimed">Claimed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="w-full text-destructive hover:text-destructive"
                      onClick={() => setPendingAction({ kind: "deleteItem", id: i.id, name: i.item_name })}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.kind === "claim" && pendingAction.status === "approved" && `Approve claim for "${pendingAction.name}"?`}
              {pendingAction?.kind === "claim" && pendingAction.status === "rejected" && `Reject claim for "${pendingAction.name}"?`}
              {pendingAction?.kind === "deleteItem" && `Delete "${pendingAction.name}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.kind === "claim" && pendingAction.status === "approved" &&
                "The item will be marked as Claimed and no longer available to others."}
              {pendingAction?.kind === "claim" && pendingAction.status === "rejected" &&
                "The claim will be rejected and the item returned to Available."}
              {pendingAction?.kind === "deleteItem" &&
                "This permanently removes the item and any related claims."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const a = pendingAction;
              setPendingAction(null);
              if (!a) return;
              if (a.kind === "claim") updateClaim(a.id, a.status, a.itemId);
              else if (a.kind === "deleteItem") deleteItem(a.id);
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
