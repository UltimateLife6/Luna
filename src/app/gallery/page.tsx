import { GalleryExperience } from "@/components/gallery/GalleryExperience";
import { PageIntro } from "@/components/ui/PageIntro";
import { isConceptGallery } from "@/lib/gallery";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Gallery");
export const ensureStatic = "navigation";

export default function GalleryPage() {
  const quiet = isConceptGallery();

  return (
    <article>
      <PageIntro
        eyebrow="Portfolio"
        title="The gallery."
        description={quiet ? "Photographs of the work will be placed here." : "Harnesses, collars, and the hardware that finishes a piece."}
      />
      <GalleryExperience />
    </article>
  );
}
