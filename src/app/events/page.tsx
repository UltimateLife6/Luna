import { PageIntro } from "@/components/ui/PageIntro";
import { Container } from "@/components/ui/Container";
import { appearances } from "@/data/events";
import { pageMetadata } from "@/lib/metadata";
import type { Appearance } from "@/types/catalog";

export const metadata = pageMetadata("Events");
export const ensureStatic = "navigation";

export default function EventsPage() {
  const upcoming = appearances.filter((appearance) => appearance.status === "upcoming");
  const past = appearances.filter((appearance) => appearance.status === "past");

  return (
    <article>
      <PageIntro
        eyebrow="On the road"
        title="Appearances, when they are confirmed."
        description="Markets, conventions, and collaborations belong here only after a name, date, and place are supplied. Nothing on this page is inferred."
      />
      <Container className="grid gap-16 pb-16 sm:pb-24 lg:grid-cols-2">
        <AppearanceGroup
          title="Upcoming"
          emptyTitle="No appearances have been added to the demo."
          emptyBody="Upcoming names, dates, and venues stay off this page until they are confirmed."
          items={upcoming}
        />
        <AppearanceGroup
          title="Past"
          emptyTitle="No past appearances are on file."
          emptyBody="Earlier markets and conventions are omitted rather than reconstructed."
          items={past}
        />
      </Container>
    </article>
  );
}

function AppearanceGroup({
  title,
  emptyTitle,
  emptyBody,
  items,
}: {
  title: string;
  emptyTitle: string;
  emptyBody: string;
  items: Appearance[];
}) {
  return (
    <section className="border-t border-ivory/10 pt-10">
      <h2 className="font-editorial text-4xl leading-tight text-ivory sm:text-5xl">{title}</h2>
      {items.length === 0 ? (
        <div className="mt-8 bg-oxblood px-6 py-10 sm:px-8">
          <p className="font-editorial text-3xl italic leading-tight text-ivory sm:text-4xl">{emptyTitle}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/80">{emptyBody}</p>
        </div>
      ) : (
        <ul className="mt-8">
          {items.map((item) => (
            <li key={item.id} className="border-b border-ivory/10 py-8">
              <p className="eyebrow">{item.verification === "verified" ? "Verified" : "Demo record"}</p>
              <h3 className="mt-3 font-editorial text-3xl text-ivory sm:text-4xl">{item.name}</h3>
              {item.dateLabel ? <p className="mt-3 text-sm text-silver">{item.dateLabel}</p> : null}
              {item.location ? <p className="mt-1 text-sm text-silver">{item.location}</p> : null}
              {item.summary ? <p className="mt-4 max-w-md text-sm leading-relaxed text-silver">{item.summary}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
