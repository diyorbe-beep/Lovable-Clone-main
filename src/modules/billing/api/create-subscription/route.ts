import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BillingService } from '@/lib/billing/billing-service';
import { validateInput, createSubscriptionSchema } from '@/lib/security/validation';
import { checkRateLimit, apiRateLimiter } from '@/lib/security/rate-limiter';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const identifier = req.headers.get('x-forwarded-for') || userId;
    const rateLimitResult = await checkRateLimit(apiRateLimiter, identifier);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
          },
        }
      );
    }

    const body = await req.json();
    
    // Validate input
    const validation = validateInput(createSubscriptionSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.errors },
        { status: 400 }
      );
    }

    const { planId, paymentMethodId } = validation.data!;

    // Create subscription
    const result = await BillingService.createSubscription(
      userId,
      planId,
      paymentMethodId
    );

    if (!result.success) {
      const message =
        "error" in result && typeof result.error === "string"
          ? result.error
          : "Subscription failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!("subscription" in result) || !result.subscription) {
      return NextResponse.json(
        { error: "No subscription in response" },
        { status: 500 },
      );
    }

    return NextResponse.json({ subscription: result.subscription });
  } catch (error) {
    console.error('Create subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
