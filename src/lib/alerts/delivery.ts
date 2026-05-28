import { createHmac } from "crypto";

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

interface WebhookPayload {
  id: string;
  triggerType: string;
  conditions: Record<string, unknown>;
  event: Record<string, unknown>;
  timestamp: string;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string
): Promise<{ success: boolean; attempts: number; error?: string }> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Nexus-Signature": signature,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        return { success: true, attempts: attempt + 1 };
      }

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return {
          success: false,
          attempts: attempt + 1,
          error: `Client error ${response.status}`,
        };
      }
    } catch (error) {
      // Network/timeout errors are retried
      if (attempt === MAX_RETRIES - 1) {
        return {
          success: false,
          attempts: MAX_RETRIES,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    // Exponential backoff: 1s, 4s, 16s
    if (attempt < MAX_RETRIES - 1) {
      await sleep(BACKOFF_BASE_MS * Math.pow(4, attempt));
    }
  }

  return { success: false, attempts: MAX_RETRIES, error: "Max retries exceeded" };
}
