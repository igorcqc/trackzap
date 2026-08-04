import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { buildPrefilledMessage, buildWhatsAppUrl, generateTrackingCode } from "@/lib/tracking";

export const runtime = "nodejs";

/**
 * Public entry point for every tracking link: /r/<slug>?fbclid=...&utm_source=...
 * Logs the click with all ad attribution params, then 302s the visitor into
 * WhatsApp with a short code appended to the pre-filled message so the
 * webhook can match the eventual inbound message back to this click.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createSupabaseServiceClient();

  const { data: source } = await supabase
    .from("sources")
    .select("*")
    .eq("slug", slug)
    .eq("type", "link")
    .eq("is_active", true)
    .maybeSingle();

  if (!source) {
    return NextResponse.redirect(new URL("/link-invalido", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const fbclid = searchParams.get("fbclid");
  const cookieFbp = request.cookies.get("_fbp")?.value ?? null;
  const cookieFbc = request.cookies.get("_fbc")?.value ?? null;

  const code = generateTrackingCode();

  await supabase.from("clicks").insert({
    source_id: source.id,
    code,
    fbclid,
    fbp: cookieFbp,
    fbc: cookieFbc ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null),
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_content: searchParams.get("utm_content"),
    utm_term: searchParams.get("utm_term"),
    landing_url: request.headers.get("referer"),
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: request.headers.get("user-agent"),
  });

  const message = buildPrefilledMessage(source.prefilled_message ?? "Olá!", code);
  const waUrl = buildWhatsAppUrl(source.destination_phone!, message);

  return NextResponse.redirect(waUrl);
}
