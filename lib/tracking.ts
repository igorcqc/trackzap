import { randomBytes } from "crypto";

/**
 * Short code embedded at the end of the pre-filled WhatsApp message.
 * When the visitor sends that message unmodified, the webhook regexes this
 * code back out and matches it to the `clicks` row that generated it —
 * this is the same trick Tintim/UTMify use to bridge "web click" and
 * "WhatsApp message" without a WhatsApp-side tracking pixel.
 */
export function generateTrackingCode(): string {
  return `zap-${randomBytes(4).toString("hex")}`;
}

const CODE_PATTERN = /zap-[a-f0-9]{8}/;

export function extractTrackingCode(message: string): string | null {
  const match = message.match(CODE_PATTERN);
  return match ? match[0] : null;
}

export function buildPrefilledMessage(baseMessage: string, code: string): string {
  return `${baseMessage}\n\n(${code})`;
}

/** wa.me deep link the visitor is redirected to after a click is logged. */
export function buildWhatsAppUrl(phoneE164: string, prefilledMessage: string): string {
  const digitsOnly = phoneE164.replace(/[^\d]/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(prefilledMessage)}`;
}

/**
 * Builds the Meta-standard `fbc` value from a raw `fbclid` query param when
 * no `_fbc` cookie was present on the landing page. Format is documented at
 * developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc.
 */
export function buildFbcFromClickId(fbclid: string, clickTimeMs: number = Date.now()): string {
  return `fb.1.${clickTimeMs}.${fbclid}`;
}
