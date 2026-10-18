import { connection } from "next/server";
import { CartEditor } from "@/components/cart/CartEditor";
import { Container } from "@/components/ui/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { formatMinorUnits } from "@/lib/catalog-store/money";
import { readCartId } from "@/lib/commerce/cart-cookie";
import { checkoutBlockers, readStripeSecret, readWebhookSecret } from "@/lib/commerce/config";
import { activeShippingRates, readCart } from "@/lib/data/records";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Cart");
export const ensureStatic = "shell";

export default async function CartPage() {
  await connection();
  const cartId = await readCartId();
  const cart = cartId ? await readCart(cartId, new Date()) : null;
  const blockers = checkoutBlockers({
    secretKey: readStripeSecret(),
    webhookSecret: readWebhookSecret(),
    shippingRates: await activeShippingRates(),
  });

  return (
    <article>
      <PageIntro
        eyebrow="Cart"
        title="Items held in this browser."
        description="Prices are read from the local catalog when the cart is shown and again before checkout. Unpublished, archived, and quote-only records cannot be purchased."
      />
      <Container className="pb-20">
        {!cart || cart.lines.length === 0 ? (
          <p className="text-base text-silver">The cart is empty.</p>
        ) : (
          <CartEditor
            blockers={blockers}
            subtotalLabel={formatMinorUnits(cart.subtotalMinor, "USD")}
            lines={cart.lines.map((line) => ({
              id: line.id,
              productName: line.productName,
              productSlug: line.productSlug,
              variantLabel: line.variantLabel,
              skuLabel: line.skuLabel,
              quantity: line.quantity,
              unitLabel: formatMinorUnits(line.unitPriceMinor + line.adjustmentMinor, "USD"),
              lineLabel: line.purchasable ? formatMinorUnits(line.lineTotalMinor, "USD") : "Not included",
              unavailableReason: line.unavailableReason,
              selections: line.selections,
              leadTimeNote: line.leadTimeNote,
            }))}
          />
        )}
      </Container>
    </article>
  );
}
