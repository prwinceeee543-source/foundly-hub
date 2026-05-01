import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { ItemForm } from "@/components/item-form";

export const Route = createFileRoute("/lost")({
  head: () => ({ meta: [{ title: "Report a Lost Item — Foundly" }] }),
  component: () => (
    <PageShell title="Report a lost item" subtitle="Tell us what you lost and we'll help you find it.">
      <ItemForm type="lost" />
    </PageShell>
  ),
});
