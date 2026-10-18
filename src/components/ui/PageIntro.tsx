import { Container } from "@/components/ui/Container";

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="py-16 sm:py-24">
      <Container>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-balance font-editorial text-[2.5rem] leading-[0.95] text-ivory sm:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-silver sm:text-lg">{description}</p>
      </Container>
    </header>
  );
}
