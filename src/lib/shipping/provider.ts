import { MockCourierProvider } from "./providers/mock/client";
import { SteadfastCourierProvider } from "./providers/steadfast";
import { ShippingProvider } from "./types";
import { env } from "@/lib/config/env";

export function getShippingProvider(): ShippingProvider {
  const selected = env.SHIPPING_PROVIDER ?? "mock";
  if (selected === "steadfast") return new SteadfastCourierProvider();
  if (selected === "mock") return new MockCourierProvider();
  throw new Error("Unsupported shipping provider.");
}
