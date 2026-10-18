import type { PaymentStatus, FulfillmentStatus } from "@/lib/commerce/policy";
import type { QuoteRequest } from "@/lib/commerce/quotes";
import type { StoredOrder } from "@/lib/commerce/store";

export type OrderFilter = {
  query: string;
  payment: string;
  fulfillment: string;
};

export type QuoteFilter = {
  query: string;
  status: string;
};

export function filterOrders(orders: readonly StoredOrder[], filter: OrderFilter): StoredOrder[] {
  const query = filter.query.trim().toLowerCase();

  return orders.filter((order) => {
    if (filter.payment && order.paymentStatus !== filter.payment) {
      return false;
    }

    if (filter.fulfillment && order.fulfillmentStatus !== filter.fulfillment) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [order.email, order.id, order.shipping.name, order.shipping.city, order.shipping.country].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

export function filterQuotes(quotes: readonly QuoteRequest[], filter: QuoteFilter): QuoteRequest[] {
  const query = filter.query.trim().toLowerCase();

  return quotes.filter((quote) => {
    if (filter.status && quote.status !== filter.status) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [quote.email, quote.contactName, quote.productName, quote.id].join(" ").toLowerCase().includes(query);
  });
}

export function isPaymentFilter(value: string): value is PaymentStatus | "" {
  return value === "" || value === "pending" || value === "paid" || value === "canceled" || value === "refunded";
}

export function isFulfillmentFilter(value: string): value is FulfillmentStatus | "" {
  return value === "" || value === "unfulfilled" || value === "processing" || value === "fulfilled" || value === "canceled";
}
