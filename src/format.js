export const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const toDate = (d) =>
  typeof d === "number" ? new Date(d) : new Date(d + "T12:00:00Z");

export const shortDate = (d) =>
  toDate(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export const longDate = (d) =>
  toDate(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
