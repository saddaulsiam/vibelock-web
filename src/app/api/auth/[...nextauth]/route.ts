import { handlers } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const response = await handlers.POST(req);

  // If credentials login exceeded rate limits, return clean 429 for API clients
  const location = response.headers.get("location");
  if (location && location.includes("code=rate_limit_exceeded")) {
    const isJson =
      req.headers.get("accept")?.includes("application/json") ||
      req.headers.get("content-type")?.includes("application/json");

    if (isJson) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }
  }

  return response;
}
