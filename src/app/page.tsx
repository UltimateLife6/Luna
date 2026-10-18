import { ClosingCta } from "@/components/home/ClosingCta";
import { CraftedByHand } from "@/components/home/CraftedByHand";
import { CustomCreations } from "@/components/home/CustomCreations";
import { EventsPreview } from "@/components/home/EventsPreview";
import { FeaturedCollections } from "@/components/home/FeaturedCollections";
import { GalleryPreview } from "@/components/home/GalleryPreview";
import { Hero } from "@/components/home/Hero";

export const ensureStatic = "navigation";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedCollections />
      <CraftedByHand />
      <CustomCreations />
      <GalleryPreview />
      <EventsPreview />
      <ClosingCta />
    </>
  );
}
