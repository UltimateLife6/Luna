import { GalleryExperience } from "@/components/gallery/GalleryExperience";
import { PageIntro } from "@/components/ui/PageIntro";
import { isConceptGallery } from "@/lib/gallery";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Gallery");
export const ensureStatic = "navigation";

export default function GalleryPage() {
  const concept = isConceptGallery();

  return (
    <article>
      <PageIntro
        eyebrow="Portfolio"
        title={concept ? "Frames for a future portfolio." : "Photographs for this preview."}
        description={
          concept
            ? "Approved photographs will fill these places. Until then, the frames are labeled concept placeholders. They are not Luna Fae Leathers pieces, and they are not a portfolio."
            : "These photographs were supplied by Luna Fae Leathers for the private local preview. Photographer credit, model permission, and public publication are unverified. They are not products for sale."
        }
      />
      <GalleryExperience />
    </article>
  );
}
