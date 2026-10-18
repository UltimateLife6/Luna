import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Container } from "@/components/ui/Container";

type SectionProps = {
  id?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  headingLevel?: 1 | 2;
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
};

export function Section({
  id,
  eyebrow,
  title,
  description,
  headingLevel = 2,
  children,
  className,
  containerClassName,
}: SectionProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const hasIntro = Boolean(eyebrow || title || description);

  return (
    <section id={id} className={cn("py-16 sm:py-24", className)}>
      <Container className={containerClassName}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        {title ? (
          <Heading
            className={cn(
              "max-w-3xl font-editorial text-4xl leading-[1.05] text-ivory sm:text-6xl",
              eyebrow && "mt-4",
            )}
          >
            {title}
          </Heading>
        ) : null}
        {description ? (
          <p className={cn("max-w-2xl text-base leading-relaxed text-silver sm:text-lg", title || eyebrow ? "mt-6" : undefined)}>
            {description}
          </p>
        ) : null}
        {children ? <div className={hasIntro ? "mt-10" : undefined}>{children}</div> : null}
      </Container>
    </section>
  );
}
