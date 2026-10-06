import { publicEnv } from "./public-env";

export const appConfig = {
  name: "VibeLock",
  url: publicEnv.NEXT_PUBLIC_APP_URL,
  currency: "BDT",
  locale: "en-BD",
  country: "BD",
  timezone: "Asia/Dhaka",
} as const;

export type AppConfig = typeof appConfig;
