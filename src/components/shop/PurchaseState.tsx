import { ExternalAnchor } from "@/components/ui/ExternalAnchor";
import { etsyHref } from "@/lib/catalog";
import { site } from "@/lib/site";

type PurchaseStateProps = {
  etsyUrl?: string;
};

export function PurchaseState({ etsyUrl }: PurchaseStateProps) {
  const listing = etsyHref(etsyUrl);

  return (
    <div className="border border-ivory/10 px-5 py-6">
      {listing ? (
        <>
          <p className="eyebrow">Verified listing</p>
          <p className="mt-3 text-sm leading-relaxed text-silver">This link was stored for this record. It opens that Etsy listing, not a checkout on this site.</p>
          <p className="mt-4">
            <ExternalAnchor href={listing}>View this listing on Etsy</ExternalAnchor>
          </p>
        </>
      ) : (
        <>
          <p className="eyebrow">Purchase</p>
          <p className="mt-3 font-editorial text-2xl text-ivory">This example cannot be purchased.</p>
          <p className="mt-3 text-sm leading-relaxed text-silver">
            It is a fictional concept for the interface. No listing has been verified for it, so there is no product link.
          </p>
        </>
      )}
      <p className="mt-6 border-t border-ivory/10 pt-5 text-sm leading-relaxed text-silver">
        The maker’s shop is a separate destination. It is not a way to buy the example on this page.
      </p>
      <p className="mt-3">
        <ExternalAnchor href={site.etsyUrl}>Luna Fae Leathers on Etsy</ExternalAnchor>
      </p>
    </div>
  );
}
