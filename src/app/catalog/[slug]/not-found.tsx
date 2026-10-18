import { PageIntro } from "@/components/ui/PageIntro";

export default function CatalogProductNotFound() {
  return (
    <PageIntro
      eyebrow="Local catalog"
      title="This product is not published."
      description="The local catalog has no published record at this address. Drafts, archived records, and concept examples are not listed here."
    />
  );
}
