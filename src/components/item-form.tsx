import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export function ItemForm({ type }: { type: "lost" | "found" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("item-photos")
          .upload(path, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("item-photos").getPublicUrl(path);
        image_url = data.publicUrl;
      }

      const { error } = await supabase.from("items").insert({
        type,
        item_name: fd.get("item_name") as string,
        description: (fd.get("description") as string) || null,
        date_time: new Date(fd.get("date_time") as string).toISOString(),
        estimated_value: fd.get("estimated_value")
          ? Number(fd.get("estimated_value"))
          : null,
        brand: (fd.get("brand") as string) || null,
        color: (fd.get("color") as string) || null,
        last_location: (fd.get("last_location") as string) || null,
        image_url,
        user_id: user.id,
      });
      if (error) throw error;
      toast.success(`${type === "lost" ? "Lost" : "Found"} item submitted!`);
      navigate({ to: "/browse" });
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 shadow-[var(--shadow-card)]">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="item_name">Item name *</Label>
            <Input id="item_name" name="item_name" required placeholder="e.g. Black wallet" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} placeholder="Distinguishing details..." />
          </div>
          <div>
            <Label htmlFor="date_time">Date & time {type === "lost" ? "lost" : "found"} *</Label>
            <Input id="date_time" name="date_time" type="datetime-local" required />
          </div>
          <div>
            <Label htmlFor="estimated_value">Estimated value</Label>
            <Input id="estimated_value" name="estimated_value" type="number" step="0.01" placeholder="0.00" />
          </div>
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" name="brand" placeholder="optional" />
          </div>
          <div>
            <Label htmlFor="color">Color</Label>
            <Input id="color" name="color" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="last_location">{type === "lost" ? "Last known location" : "Where found"} *</Label>
            <Input id="last_location" name="last_location" required placeholder="e.g. Library, 2nd floor" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="photo">Upload photo</Label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input bg-muted/30 p-4 hover:bg-muted/50">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {file ? file.name : "Click to upload an image"}
              </span>
              <input
                id="photo"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "Submitting..." : `Submit ${type} item`}
        </Button>
      </form>
    </Card>
  );
}
