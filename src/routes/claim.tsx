import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/claim")({
  head: () => ({ meta: [{ title: "Claim Item — Foundly" }] }),
  component: ClaimPage,
});

function ClaimPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [proof, setProof] = useState("");
  const [agreement, setAgreement] = useState(false);
  const [signature, setSignature] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!itemName.trim()) return toast.error("Enter the item you want to claim");
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
        id_image_url = path;
      }
      let proof_image_url: string | null = null;
      if (proofFile) {
        const path = `${user.id}/${Date.now()}-${proofFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("claim-proofs")
          .upload(path, proofFile);
        if (upErr) throw upErr;
        proof_image_url = path;
      }
      const { error } = await supabase.from("claims").insert({
        item_id: null,
        claimed_item_name: itemName.trim(),
        claimed_item_description: itemDesc.trim() || null,
        user_id: user.id,
        id_image_url,
        proof_image_url,
        proof_description: proof,
        agreement,
        digital_signature: signature,
      });
      if (error) throw error;
      toast.success("Claim request sent for approval.");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell title="Claim an item" subtitle="Tell us what you lost. An admin will verify your claim.">
      <Card className="p-6 sm:p-8 shadow-[var(--shadow-card)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="item-name">What item are you claiming? *</Label>
            <Input
              id="item-name"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Black leather wallet, Blue Hydroflask, Silver ring"
            />
          </div>

          <div>
            <Label htmlFor="item-desc">Item description</Label>
            <Textarea
              id="item-desc"
              rows={3}
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              placeholder="Color, brand, distinguishing marks, where/when you lost it..."
            />
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
            <Label htmlFor="proof-upload">Upload proof of ownership photo</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-muted/30 p-4 hover:bg-muted/50">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {proofFile ? proofFile.name : "A photo showing you previously had the item (optional)"}
              </span>
              <input
                id="proof-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
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
              placeholder="Describe unique features only the owner would know (scratch on the back, contents inside, serial number, etc.)"
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
