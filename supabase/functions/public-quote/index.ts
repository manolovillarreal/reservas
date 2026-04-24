export const config = {
  verify_jwt: false,
}

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const formatDateLongEs = (value: string | null) => {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

const formatCop = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)

const calcNights = (checkIn: string | null, checkOut: string | null): number => {
  if (!checkIn || !checkOut) return 0
  const diff = new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    const format = url.searchParams.get('format')

    if (!token) {
      return new Response('Token requerido.', { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: inquiry, error: inquiryError } = await adminClient
      .from('inquiries')
      .select(`
        id, account_id, guest_first_name, guest_last_name, check_in, check_out, adults, minors, children, infants,
        price_per_night, discount_percentage, quote_expires_at,
        inquiry_units(unit_id, units(name))
      `)
      .eq('quote_token', token)
      .maybeSingle()

    if (inquiryError || !inquiry) {
      if (format === 'json') {
        return Response.json({ error: 'not_found' }, { status: 404, headers: corsHeaders })
      }
      return new Response(notFoundHtml(), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const { data: profile } = await adminClient
      .from('account_profile')
      .select('commercial_name, legal_name, logo_url, phone, email, website')
      .eq('account_id', inquiry.account_id)
      .maybeSingle()

    const { data: settingsRow } = await adminClient
      .from('settings')
      .select('voucher_conditions')
      .eq('account_id', inquiry.account_id)
      .maybeSingle()

    const businessName = profile?.commercial_name || profile?.legal_name || 'Alojamiento'
    const logoUrl: string | null = profile?.logo_url || null
    const conditions = String(settingsRow?.voucher_conditions || '').trim()
    const guestName = `${inquiry.guest_first_name || ''} ${inquiry.guest_last_name || ''}`.trim() || 'Huésped'

    const nights = calcNights(inquiry.check_in, inquiry.check_out)
    const adults = Number(inquiry.adults || 0)
    const minors = Number(inquiry.minors || 0)
    const children = Number(inquiry.children || 0)
    const infants = Number(inquiry.infants || 0)
    const totalGuests = adults + minors + children + infants
    const pricePerNight = Number(inquiry.price_per_night || 0)
    const discountPct = Number(inquiry.discount_percentage || 0)
    const subtotal = pricePerNight * nights
    const discountAmount = subtotal * discountPct / 100
    const total = Math.max(subtotal - discountAmount, 0)

    const unitsLabel = (inquiry.inquiry_units || [])
      .map((row: { units?: { name?: string } }) => row.units?.name)
      .filter(Boolean)
      .join(', ')

    const isExpired = inquiry.quote_expires_at
      ? new Date(inquiry.quote_expires_at) < new Date()
      : false

    const expiryFormatted = inquiry.quote_expires_at
      ? new Intl.DateTimeFormat('es-CO', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
        }).format(new Date(inquiry.quote_expires_at))
      : null

    if (format === 'json') {
      return Response.json({
        business_name: businessName,
        logo_url: logoUrl,
        guest_name: guestName,
        check_in: inquiry.check_in,
        check_out: inquiry.check_out,
        adults,
        minors,
        children,
        infants,
        total_guests: totalGuests,
        nights,
        units_label: unitsLabel,
        price_per_night: pricePerNight > 0 ? pricePerNight : null,
        discount_percentage: discountPct > 0 ? discountPct : null,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        total: total > 0 ? total : null,
        quote_expires_at: inquiry.quote_expires_at,
        expiry_formatted: expiryFormatted,
        is_expired: isExpired,
        conditions: conditions || null,
      }, { headers: corsHeaders })
    }

    // Serve full HTML with OG tags
    const ogDescription = [
      guestName ? `Hola ${guestName}` : null,
      inquiry.check_in ? `Check-in: ${formatDateLongEs(inquiry.check_in)}` : null,
      inquiry.check_out ? `Check-out: ${formatDateLongEs(inquiry.check_out)}` : null,
      nights > 0 ? `${nights} noches` : null,
    ].filter(Boolean).join(' · ')

    const html = renderHtml({
      businessName,
      logoUrl,
      guestName,
      checkIn: inquiry.check_in,
      checkOut: inquiry.check_out,
      adults,
      children,
      totalGuests,
      nights,
      unitsLabel,
      pricePerNight,
      discountPct,
      discountAmount,
      total,
      expiryFormatted,
      isExpired,
      conditions,
      ogDescription,
    })

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno.'
    return new Response(msg, { status: 500, headers: corsHeaders })
  }
})

// ── HTML helpers ────────────────────────────────────────────────────────────

interface RenderParams {
  businessName: string
  logoUrl: string | null
  guestName: string | null
  checkIn: string | null
  checkOut: string | null
  adults: number
  children: number
  totalGuests: number
  nights: number
  unitsLabel: string
  pricePerNight: number
  discountPct: number
  discountAmount: number
  total: number
  expiryFormatted: string | null
  isExpired: boolean
  conditions: string
  ogDescription: string
}

const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function renderHtml(p: RenderParams): string {
  const logoTag = p.logoUrl
    ? `<img src="${esc(p.logoUrl)}" alt="${esc(p.businessName)}" style="width:64px;height:64px;object-fit:contain;border-radius:12px;border:1px solid #e5e7eb;background:#fff;display:block;margin:0 auto 12px" />`
    : ''

  const expiredBanner = p.isExpired
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#b91c1c;font-weight:600;text-align:center">⚠️ Esta cotización ha vencido.</div>`
    : ''

  const expiryLine = p.expiryFormatted && !p.isExpired
    ? `<p style="margin:0;color:#92400e;font-size:14px">⏰ <strong>Válida hasta:</strong> ${esc(p.expiryFormatted)}</p>`
    : ''

  const staySection = p.checkIn && p.checkOut && p.nights > 0
    ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:14px;line-height:1.7;color:#374151">
        <p style="margin:0">🗓 <strong>Check-in:</strong> ${esc(formatDateLongEs(p.checkIn))}</p>
        <p style="margin:0">🗓 <strong>Check-out:</strong> ${esc(formatDateLongEs(p.checkOut))}</p>
        <p style="margin:0">🌙 ${p.nights} ${p.nights === 1 ? 'noche' : 'noches'} · ${p.totalGuests} ${p.totalGuests === 1 ? 'persona' : 'personas'}</p>
        ${p.unitsLabel ? `<p style="margin:0">🏠 ${esc(p.unitsLabel)}</p>` : ''}
      </div>`
    : ''

  const priceSection = p.pricePerNight > 0 && p.nights > 0
    ? `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:14px;line-height:1.9;color:#374151">
        <p style="margin:0">💰 <strong>Precio por noche:</strong> ${esc(formatCop(p.pricePerNight))}</p>
        ${p.discountPct > 0 ? `<p style="margin:0">🎁 <strong>Descuento (${p.discountPct}%):</strong> -${esc(formatCop(p.discountAmount))}</p>` : ''}
        <p style="margin:0;font-size:16px;font-weight:700;color:#111827">💵 Total: ${esc(formatCop(p.total))}</p>
      </div>`
    : ''

  const conditionsSection = p.conditions
    ? `<div style="border-top:1px solid #e5e7eb;padding-top:14px;margin-top:4px;font-size:13px;color:#6b7280;line-height:1.6"><p style="margin:0 0 4px;font-weight:600;color:#374151">📋 Condiciones</p><p style="margin:0;white-space:pre-wrap">${esc(p.conditions)}</p></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(p.businessName)} · Cotización</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(p.businessName)} · Cotización" />
  <meta property="og:description" content="${esc(p.ogDescription)}" />
  ${p.logoUrl ? `<meta property="og:image" content="${esc(p.logoUrl)}" />` : ''}
  <meta property="og:site_name" content="${esc(p.businessName)}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(p.businessName)} · Cotización" />
  <meta name="twitter:description" content="${esc(p.ogDescription)}" />
  ${p.logoUrl ? `<meta name="twitter:image" content="${esc(p.logoUrl)}" />` : ''}
</head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px 16px 64px">
  <div style="max-width:520px;margin:0 auto">
    <div style="text-align:center;margin-bottom:20px">
      ${logoTag}
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827">${esc(p.businessName)}</h1>
      <p style="margin:0;font-size:14px;color:#6b7280">Cotización de hospedaje</p>
    </div>

    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 20px 4px;box-shadow:0 1px 3px rgba(0,0,0,.07)">
      ${p.guestName ? `<h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827">Hola ${esc(p.guestName)} 👋</h2>` : ''}
      ${expiredBanner}
      ${staySection}
      ${priceSection}
      ${expiryLine ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:16px">${expiryLine}</div>` : ''}
      ${conditionsSection}
      <p style="margin:16px 0 16px;font-size:13px;color:#9ca3af;text-align:center">Para confirmar o consultar, contáctanos.</p>
    </div>
  </div>
</body>
</html>`
}

function notFoundHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cotización no encontrada</title>
</head>
<body style="margin:0;background:#f3f4f6;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="text-align:center;padding:40px">
    <h1 style="color:#374151">Cotización no encontrada</h1>
    <p style="color:#6b7280">El enlace puede ser inválido o la cotización fue eliminada.</p>
  </div>
</body>
</html>`
}
