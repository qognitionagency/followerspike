import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { optionalEnv } from '@/lib/env'

const PUBLIC_PATHS = [
  '/',
  '/pricing',
  '/login',
  '/signup',
  '/callback',
  '/trust',
  '/security',
  '/privacy',
  '/terms',
  '/dpa',
  '/subprocessors',
];

const PUBLIC_PREFIXES = [
  '/tools',
  '/api/auth',
  '/api/webhooks/razorpay',
  '/api/cron/dispatch',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    optionalEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'),
    optionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'example-anon-key'),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
