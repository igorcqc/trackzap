import { createHash, randomUUID } from "crypto";

export type MetaCredentials = {
  pixelId: string;
  accessToken: string;
  testEventCode?: string | null;
};

export type SendMetaEventInput = {
  eventName: string; // "Contact" | "Lead" | "Purchase" | custom
  eventId?: string; // for dedup with a browser Pixel firing the same event
  phone?: string | null; // E.164, no "+"
  clickId?: string | null; // fbc (fbclid-derived), for link-sourced leads
  ctwaClickId?: string | null; // ctwa_clid, for native Click-to-WhatsApp ad leads
  browserId?: string | null; // fbp cookie
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  value?: number | null;
  currency?: string | null;
  sourceUrl?: string | null;
};

function sha256(input: string): string {
  return createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

/** Normalizes a phone into the digits-only, country-code-prefixed form Meta expects before hashing. */
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

/**
 * Sends a server-side event to the Meta Conversions API for a WhatsApp
 * touchpoint (link click matched to an inbound message, or a manually
 * marked conversion). Returns the raw Graph API response so the caller can
 * persist it for auditing/debugging.
 */
export async function sendMetaEvent(
  creds: MetaCredentials,
  input: SendMetaEventInput
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const eventId = input.eventId ?? randomUUID();

  const userData: Record<string, unknown> = {};
  if (input.phone) userData.ph = [sha256(normalizePhone(input.phone))];
  if (input.clientIpAddress) userData.client_ip_address = input.clientIpAddress;
  if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;
  if (input.browserId) userData.fbp = input.browserId;
  if (input.clickId) userData.fbc = input.clickId;
  if (input.ctwaClickId) userData.ctwa_clid = input.ctwaClickId;

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        event_source_url: input.sourceUrl ?? undefined,
        user_data: userData,
        custom_data: {
          currency: input.currency ?? undefined,
          value: input.value ?? undefined,
        },
      },
    ],
    ...(creds.testEventCode ? { test_event_code: creds.testEventCode } : {}),
  };

  const url = `https://graph.facebook.com/v21.0/${creds.pixelId}/events?access_token=${encodeURIComponent(
    creds.accessToken
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}
