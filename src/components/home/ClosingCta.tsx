import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export function ClosingCta() {
  return (
    <section aria-labelledby="home-closing-heading" className="border-t border-ivory/10 py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="eyebrow">Commissions</p>
          <h2 id="home-closing-heading" className="mt-5 max-w-3xl font-editorial text-4xl leading-[1.02] text-ivory sm:text-6xl">
            Begin with a custom piece.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-silver">
            A commission is shaped with the person who will wear it.
          </p>
        </div>
        <div className="lg:col-span-4 lg:justify-self-end">
          <Button href="/custom">Custom Creations</Button>
        </div>
      </Container>
    </section>
  );
}
