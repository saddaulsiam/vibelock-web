import { MockCourierProvider } from "./providers/mock/client";
import { SteadfastCourierProvider } from "./providers/steadfast";
import { ShippingProvider } from "./types";
import { env } from "@/lib/config/env";

export function getShippingProvider(): ShippingProvider {
  const apiKey = env.STEADFAST_API_KEY || process.env.STEADFAST_API_KEY;
  const secretKey = env.STEADFAST_SECRET_KEY || process.env.STEADFAST_SECRET_KEY;
  const selected =
    env.SHIPPING_PROVIDER ||
    process.env.SHIPPING_PROVIDER ||
    (process.env.NODE_ENV === "test" ? "mock" : apiKey && secretKey ? "steadfast" : "mock");
  if (selected === "steadfast") return new SteadfastCourierProvider(apiKey, secretKey);
  if (selected === "mock") return new MockCourierProvider();
  throw new Error("Unsupported shipping provider.");
}
