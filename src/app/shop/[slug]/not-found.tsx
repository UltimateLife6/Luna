import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";

export default function ProductNotFound() {
  return (
    <Section
      eyebrow="Catalog"
      title="This piece is not listed."
      headingLevel={1}
      description="The address does not match a piece in the shop."
    >
      <Button href="/shop" variant="secondary">
        Back to the shop
      </Button>
    </Section>
  );
}
