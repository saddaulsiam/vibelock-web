import { MockCourierProvider } from "./providers/mock/client";
import { SteadfastCourierProvider } from "./providers/steadfast";
import { ShippingProvider } from "./types";

export function getShippingProvider(): ShippingProvider {
  const selected = process.env.SHIPPING_PROVIDER ?? "mock";
  if (selected === "steadfast") return new SteadfastCourierProvider();
  if (selected === "mock") return new MockCourierProvider();
  throw new Error("Unsupported shipping provider.");
}
