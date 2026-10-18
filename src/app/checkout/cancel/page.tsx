import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { Button } from "@/components/ui/Button";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Checkout canceled");

export default function CheckoutCancelPage() {
  return (
    <article>
      <PageIntro
        eyebrow="Checkout"
        title="Checkout was not finished."
        description="Leaving Stripe does not mark an order paid or canceled. Stripe was asked to expire the Checkout session at the end of the hold. The finished piece stays reserved until that session is closed and the payment retry window has passed."
      />
      <Container className="pb-20">
        <Button href="/cart" variant="secondary">
          Return to the cart
        </Button>
      </Container>
    </article>
  );
}
