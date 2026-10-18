import { TrackForm } from "@/components/orders/TrackForm";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Track an order");

export default function TrackOrderPage() {
  return (
    <article>
      <PageIntro eyebrow="Orders" title="Track an order." description="Use the tracking link from checkout. An account is not required." />
      <Container className="pb-20">
        <TrackForm />
      </Container>
    </article>
  );
}
