import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { ItemForm } from "@/components/item-form";

export const Route = createFileRoute("/found")({
  head: () => ({ meta: [{ title: "Report a Found Item — Foundly" }] }),
  component: () => (
    <PageShell title="Report a found item" subtitle="Help return someone's belongings by submitting it here.">
      <ItemForm type="found" />
    </PageShell>
  ),
});
