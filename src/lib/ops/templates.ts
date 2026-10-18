export type NoticeLine = {
  productName: string;
  variantLabel: string;
  quantity: number;
  selections: string[];
};

export type OrderNotice = {
  paymentStatus: string;
  fulfillmentStatus: string;
  shipment: "shipped" | "not-recorded";
  carrier: string;
  trackingNumber: string;
  lines: NoticeLine[];
  totalLabel: string;
  trackingUrl: string | null;
};

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function orderConfirmation(notice: OrderNotice): EmailContent {
  const lines = lineBlock(notice.lines);
  const link = notice.trackingUrl ? `Tracking link: ${notice.trackingUrl}` : "The tracking link from the checkout return page still opens this order.";
  const text = [
    "Payment for this order is recorded as paid.",
    `Payment status: ${notice.paymentStatus}.`,
    `Fulfillment status: ${notice.fulfillmentStatus}.`,
    `Shipment: ${notice.shipment}.`,
    lines,
    `Total: ${notice.totalLabel}.`,
    link,
    "This message does not promise a ship date.",
  ].join("\n");

  return {
    subject: "Order payment confirmed",
    text,
    html: paragraph(text),
  };
}

export function orderCancellation(notice: OrderNotice): EmailContent {
  const text = [
    "This order is recorded as canceled.",
    `Payment status: ${notice.paymentStatus}.`,
    `Fulfillment status: ${notice.fulfillmentStatus}.`,
    lineBlock(notice.lines),
    "This message does not describe a refund.",
  ].join("\n");

  return { subject: "Order canceled", text, html: paragraph(text) };
}

export function shipmentNotice(notice: OrderNotice): EmailContent {
  const carrier = notice.carrier ? `Carrier entered: ${notice.carrier}.` : "No carrier name was entered.";
  const text = [
    "A tracking number was saved for this order.",
    `Payment status: ${notice.paymentStatus}.`,
    `Fulfillment status: ${notice.fulfillmentStatus}.`,
    carrier,
    `Tracking number: ${notice.trackingNumber}.`,
    notice.trackingUrl ? `Tracking link: ${notice.trackingUrl}` : "Use the tracking link from checkout to see the saved number.",
    "This message does not promise a delivery date.",
  ].join("\n");

  return { subject: "Shipment tracking saved", text, html: paragraph(text) };
}

export function quoteAcknowledgement(input: { productName: string }): EmailContent {
  const text = [
    "The quote request was saved.",
    `Product: ${input.productName}.`,
    "Status: received.",
    "This is not an order, a price, or a production date.",
  ].join("\n");

  return { subject: "Quote request received", text, html: paragraph(text) };
}

export function quoteStatusUpdate(input: { productName: string; status: string }): EmailContent {
  const text = [
    "The saved status of this quote request changed.",
    `Product: ${input.productName}.`,
    `Status: ${input.status}.`,
    "This message does not add a price or a production date.",
  ].join("\n");

  return { subject: "Quote request status", text, html: paragraph(text) };
}

export function emailVerification(input: { verifyUrl: string }): EmailContent {
  const text = [
    "Use this link to verify the email address on the customer account.",
    input.verifyUrl,
    "Verifying the address does not place an order.",
  ].join("\n");

  return { subject: "Verify this email address", text, html: paragraph(text) };
}

function lineBlock(lines: NoticeLine[]): string {
  if (lines.length === 0) {
    return "Items: none recorded.";
  }

  return lines
    .map((line) => {
      const selections = line.selections.length > 0 ? ` (${line.selections.join("; ")})` : "";
      return `${line.quantity} × ${line.productName} — ${line.variantLabel}${selections}`;
    })
    .join("\n");
}

function paragraph(text: string): string {
  return `<p>${escapeHtml(text).replaceAll("\n", "<br>")}</p>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}
