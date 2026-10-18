import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";

export default function ProductNotFound() {
  return (
    <Section
      eyebrow="Catalog"
      title="This example is not in the catalog."
      headingLevel={1}
      description="The address does not match a concept example. Nothing was removed from a live inventory, because this demo does not sell pieces."
    >
      <Button href="/shop" variant="secondary">
        Back to the shop
      </Button>
    </Section>
  );
}
