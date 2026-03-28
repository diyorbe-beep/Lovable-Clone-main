import { NextResponse } from 'next/server';

export class SecurityHeaders {
  static setHeaders(response: NextResponse): NextResponse {
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    // XSS Protection
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy — Clerk needs FAPI host + Turnstile; see
    // https://clerk.com/docs/guides/secure/best-practices/csp-headers
    const csp = [
      "default-src 'self'",
      [
        "script-src 'self'",
        "'unsafe-eval'",
        "'unsafe-inline'",
        "https://js.stripe.com",
        "https://*.js.stripe.com",
        "https://*.clerk.accounts.dev",
        "https://challenges.cloudflare.com",
      ].join(" "),
      "style-src 'self' 'unsafe-inline'",
      ["img-src 'self'", "data:", "https:", "blob:", "https://img.clerk.com"].join(
        " ",
      ),
      "font-src 'self'",
      [
        "connect-src 'self'",
        "https://api.stripe.com",
        "https://*.clerk.accounts.dev",
        "wss://*.clerk.accounts.dev",
        "https://clerk-telemetry.com",
        "https://*.clerk-telemetry.com",
      ].join(" "),
      [
        "frame-src 'self'",
        "https://js.stripe.com",
        "https://*.js.stripe.com",
        "https://hooks.stripe.com",
        "https://challenges.cloudflare.com",
        "https://*.clerk.accounts.dev",
      ].join(" "),
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
    
    response.headers.set('Content-Security-Policy', csp);
    
    // HSTS (HTTPS only)
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Permissions Policy
    const permissions = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=(self)',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ].join(', ');
    
    response.headers.set('Permissions-Policy', permissions);
    
    return response;
  }
}
