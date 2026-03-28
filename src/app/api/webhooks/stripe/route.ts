import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { StripeService } from '@/lib/billing/stripe';
import { BillingService } from '@/lib/billing/billing-service';
import { checkRateLimit, apiRateLimiter } from '@/lib/security/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting for webhook endpoint
    const identifier = req.headers.get('x-forwarded-for') || 'webhook';
    const rateLimitResult = await checkRateLimit(apiRateLimiter, identifier);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { status: 429 }
      );
    }

    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const eventResult = await StripeService.constructWebhookEvent(body, signature);
    
    if (!eventResult.success) {
      console.error('Webhook signature verification failed:', eventResult.error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Handle the event
    const result = await BillingService.handleWebhookEvent(eventResult.event);
    
    if (!result.success) {
      console.error('Webhook handling failed:', result.error);
      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
