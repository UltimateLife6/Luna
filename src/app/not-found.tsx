import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Page not found");

export default function NotFound() {
  return (
    <Section
      eyebrow="Missing page"
      title="This page could not be found."
      headingLevel={1}
      description="The address may be mistyped. Shop, custom orders, gallery, events, about, and contact are in the menu."
    >
      <Button href="/">Return home</Button>
    </Section>
  );
}
