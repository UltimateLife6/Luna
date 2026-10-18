"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Section
      eyebrow="Something went wrong"
      title="This page could not be displayed."
      headingLevel={1}
      description="The demo hit an unexpected error. You can try the page again, or return home."
    >
      {error.digest ? <p className="text-sm text-silver">Reference {error.digest}</p> : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button href="/" variant="secondary">
          Return home
        </Button>
      </div>
    </Section>
  );
}
