import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function ClosingCta() {
  return (
    <section aria-labelledby="home-closing-heading" className="border-t border-ivory/10 py-20 sm:py-28">
      <Container>
        <p className="eyebrow">Continue</p>
        <h2 id="home-closing-heading" className="mt-5 max-w-4xl font-editorial text-4xl leading-[1.02] text-ivory sm:text-6xl lg:text-7xl">
          Explore the collection. Shape a piece of your own.
        </h2>
        <div className="mt-10 h-px w-16 bg-burgundy" aria-hidden="true" />
        <div className="mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Button href="/shop">Explore the Collection</Button>
          <Button href="/custom" variant="secondary">
            Custom Creations
          </Button>
        </div>
      </Container>
    </section>
  );
}
