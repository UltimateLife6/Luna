import { PageIntro } from "@/components/ui/PageIntro";

export default function CatalogProductNotFound() {
  return (
    <PageIntro
      eyebrow="Catalog"
      title="This piece is not published."
      description="There is no published piece at this address."
    />
  );
}
