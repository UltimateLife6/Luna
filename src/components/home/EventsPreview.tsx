import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { appearances } from "@/data/events";

export function EventsPreview() {
  const upcoming = appearances.filter((appearance) => appearance.status === "upcoming");
  const past = appearances.filter((appearance) => appearance.status === "past");
  const hasAppearances = upcoming.length > 0 || past.length > 0;

  return (
    <section aria-labelledby="home-events-heading" className="border-t border-ivory/10 py-16 sm:py-24">
      <Container className="grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-4">
          <p className="eyebrow">On the road</p>
          <h2 id="home-events-heading" className="mt-4 font-editorial text-4xl leading-[1.05] text-ivory sm:text-6xl">
            Appearances
          </h2>
          <p className="mt-6 text-sm leading-relaxed text-silver sm:text-base">
            Markets, conventions, and collaborations. A date appears only when it has been confirmed.
          </p>
        </div>
        <div className="bg-oxblood px-6 py-10 sm:px-10 sm:py-14 lg:col-span-8">
          {hasAppearances ? (
            <ul className="divide-y divide-ivory/15">
              {[...upcoming, ...past].slice(0, 3).map((appearance) => (
                <li key={appearance.id} className="py-5 first:pt-0 last:pb-0">
                  <p className="font-editorial text-3xl text-ivory">{appearance.name}</p>
                  <p className="mt-2 text-sm text-ivory/75">
                    {appearance.dateLabel ?? "Date not supplied"}
                    {appearance.location ? ` · ${appearance.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="eyebrow text-ivory/70">Upcoming</p>
              <p className="mt-4 font-editorial text-4xl italic leading-tight text-ivory sm:text-5xl">No dates are listed.</p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/80">
                This space stays empty until an appearance is supplied. No convention or market has been invented for the demo.
              </p>
            </>
          )}
          <div className="mt-8">
            <Button href="/events" variant="secondary" className="border-ivory/50 hover:border-ivory">
              All appearances
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
