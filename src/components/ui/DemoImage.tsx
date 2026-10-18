import Image from "next/image";
import { assetForPublicPath, displayPath } from "@/data/image-assets";
import { cn } from "@/lib/cn";

type DemoImageProps = {
  /**
   * Local public path, for example `/images/hero.jpg`.
   * Place the file in `public/images`. Remote URLs are ignored so this demo cannot hotlink.
   */
  src?: string;
  alt: string;
  /** Small label in the empty frame. */
  kicker?: string;
  label?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  aspectClassName?: string;
  /** Fill a positioned parent. Use this for full-bleed frames. */
  fill?: boolean;
  /** Hide the frame from assistive tech when a nearby caption names it. */
  decorative?: boolean;
  /** CSS object-position for an approved photograph. Defaults to the center. */
  objectPosition?: string;
};

function isLocalSrc(src: string | undefined): src is string {
  return typeof src === "string" && src.startsWith("/") && !src.startsWith("//");
}

export function DemoImage({
  src,
  alt,
  kicker = "Demo placeholder",
  label = "Approved photography can replace this frame.",
  priority = false,
  sizes = "(min-width: 1024px) 40vw, 100vw",
  className,
  aspectClassName = "aspect-[4/5]",
  fill = false,
  decorative = false,
  objectPosition = "center",
}: DemoImageProps) {
  const localSrc = displayPath(isLocalSrc(src) ? src : undefined);
  const asset = assetForPublicPath(localSrc);
  const privatePreview = localSrc?.startsWith("/private-preview/");
  const uploadedMedia = localSrc?.startsWith("/media/");

  const frame = cn("overflow-hidden bg-oxblood", fill ? "absolute inset-0 h-full w-full" : cn("relative", aspectClassName), className);

  if (!localSrc) {
    return (
      <div className={frame} role={decorative ? undefined : "img"} aria-label={decorative ? undefined : alt} aria-hidden={decorative ? true : undefined}>
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8" aria-hidden="true">
          <p className="eyebrow text-ivory/80">{kicker}</p>
          <p className="mt-3 max-w-xs font-editorial text-2xl leading-tight text-ivory sm:text-3xl">{label}</p>
        </div>
      </div>
    );
  }

  const description = decorative ? "" : asset?.alt || alt;

  return (
    <figure className={frame} aria-hidden={decorative ? true : undefined}>
      {privatePreview || uploadedMedia ? (
        // The derivative stays outside `public`. next/image only serves files kept there.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={localSrc}
          alt={description}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition }}
        />
      ) : (
        <Image
          src={localSrc}
          alt={description}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
          style={{ objectPosition }}
        />
      )}
      {asset?.photographerCredit ? <figcaption className="sr-only">{asset.photographerCredit}</figcaption> : null}
    </figure>
  );
}
