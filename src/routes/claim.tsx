import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/claim")({
  validateSearch: (s: Record<string, unknown>) => ({ itemId: (s.itemId as string) || "" }),
  head: () => ({ meta: [{ title: "Claim Item — Foundly" }] }),
  component: ClaimPage,
});

function ClaimPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [items, setItems] = useState<{ id: string; item_name: string }[]>([]);
  const [itemId, setItemId] = useState(search.itemId);
  const [proof, setProof] = useState("");
  const [agreement, setAgreement] = useState(false);
  const [signature, setSignature] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("items")
      .select("id, item_name")
      .eq("type", "found")
      .neq("status", "claimed")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!itemId) return toast.error("Select an item");
    if (!agreement) return toast.error("You must accept the agreement");
    setSubmitting(true);
    try {
      let id_image_url: string | null = null;
      if (idFile) {
        const path = `${user.id}/${Date.now()}-${idFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("claim-ids")
          .upload(path, idFile);
        if (upErr) throw upErr;
        id_image_url = path; // private bucket — store path
      }
      const { error } = await supabase.from("claims").insert({
        item_id: itemId,
        user_id: user.id,
        id_image_url,
        proof_description: proof,
        agreement,
        digital_signature: signature,
      });
      if (error) throw error;
      // mark item pending
      await supabase.from("items").update({ status: "pending" }).eq("id", itemId);
      toast.success("Claim request sent for approval.");
      navigate({ to: "/browse" });
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell title="Claim an item" subtitle="Verify ownership to recover a found item.">
      <Card className="p-6 sm:p-8 shadow-[var(--shadow-card)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Select item *</Label>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger><SelectValue placeholder="Choose a found item..." /></SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.item_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="id-upload">Upload valid ID *</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-muted/30 p-4 hover:bg-muted/50">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {idFile ? idFile.name : "Upload your student ID or government ID"}
              </span>
              <input
                id="id-upload"
                type="file"
                accept="image/*"
                className="hidden"
                required
                onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div>
            <Label htmlFor="proof">Proof of ownership *</Label>
            <Textarea
              id="proof"
              required
              rows={4}
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="Describe a unique feature not visible in the item's photo (e.g. scratch on the back, content inside, etc.)"
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <Checkbox id="agree" checked={agreement} onCheckedChange={(c) => setAgreement(c === true)} />
            <Label htmlFor="agree" className="text-sm font-normal leading-relaxed cursor-pointer">
              I confirm that the information provided is true and accurate. I understand
              that providing false information may result in account suspension.
            </Label>
          </div>

          <div>
            <Label htmlFor="sig">Digital signature (type your full name) *</Label>
            <Input
              id="sig"
              required
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Your full legal name"
              className="font-serif italic text-lg"
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Submitting..." : "Submit claim"}
          </Button>
        </form>
      </Card>
    </PageShell>
  );
}
