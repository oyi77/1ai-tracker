import { type NextRequest } from "next/server";
import { validateApiKey } from "./auth";
import { checkRateLimit } from "./rate-limit";
import { apiError } from "./response";

export function withApiAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (request: NextRequest, context: any) => Promise<Response>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (request: NextRequest, context: any): Promise<Response> => {
    // API key validation
    if (!validateApiKey(request)) {
      return apiError("Invalid or missing API key", 401);
    }

    // Rate limiting by IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
    const { allowed, remaining } = await checkRateLimit(`api:${ip}`);

    if (!allowed) {
      return apiError("Rate limit exceeded. Try again later.", 429);
    }

    const response = await handler(request, context);

    // Add rate limit headers
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Limit", "100");

    return response;
  };
}
