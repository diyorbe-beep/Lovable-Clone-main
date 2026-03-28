import prisma from "@/lib/prisma";
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  validateInput,
} from "@/lib/security/validation";

import { StripeService } from "./stripe";

/** Stripe API returns period fields on subscription objects; keep loose for SDK typing drift. */
type StripeSubWithPeriods = {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  trial_start: number | null;
  trial_end: number | null;
  cancel_at_period_end: boolean;
};

function asStripeSubscription(raw: unknown): StripeSubWithPeriods | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.current_period_start !== "number" ||
    typeof o.current_period_end !== "number" ||
    typeof o.id !== "string" ||
    typeof o.status !== "string"
  ) {
    return null;
  }
  return o as StripeSubWithPeriods;
}

export class BillingService {
  static async getBillingPlans() {
    try {
      const plans = await prisma.billingPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      return { success: true, plans };
    } catch (error) {
      console.error('Error fetching billing plans:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async createCustomer(userId: string, email: string, name?: string) {
    try {
      // Check if customer already exists
      const existingSubscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (existingSubscription) {
        return { success: true, customerId: existingSubscription.stripeCustomerId };
      }

      // Create Stripe customer
      const stripeResult = await StripeService.createCustomer({
        email,
        name,
        metadata: { userId },
      });

      if (!stripeResult.success) {
        return stripeResult;
      }

      const customer = stripeResult.customer;
      if (!customer || typeof customer === "string") {
        return { success: false, error: "Invalid Stripe customer response" };
      }

      const stripeCustomerId = customer.id;

      // Create subscription record
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          stripeCustomerId,
          status: "INACTIVE",
          planId: "", // Will be set when subscribing to a plan
        },
      });

      return {
        success: true,
        customerId: stripeCustomerId,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async createSubscription(
    userId: string,
    planId: string,
    paymentMethodId: string,
    trialPeriodDays?: number
  ) {
    try {
      // Validate input
      const validation = validateInput(createSubscriptionSchema, {
        planId,
        paymentMethodId,
      });
      if (!validation.success) {
        return { success: false, error: 'Invalid input data' };
      }

      // Get billing plan
      const plan = await prisma.billingPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        return { success: false, error: 'Billing plan not found' };
      }

      // Get or create customer
      const customerResult = await this.createCustomer(userId, "");
      if (!customerResult.success) {
        return customerResult;
      }
      if (!("customerId" in customerResult) || !customerResult.customerId) {
        return { success: false, error: "Missing Stripe customer id" };
      }
      const stripeCustomerId = customerResult.customerId;

      // Attach payment method to customer
      const attachResult = await StripeService.attachPaymentMethod(
        paymentMethodId,
        stripeCustomerId,
      );
      if (!attachResult.success) {
        return attachResult;
      }

      // Create Stripe subscription
      const subscriptionResult = await StripeService.createSubscription({
        customerId: stripeCustomerId,
        priceId: plan.stripePriceId,
        paymentMethodId,
        trialPeriodDays,
        metadata: { userId, planId },
      });

      if (!subscriptionResult.success) {
        return subscriptionResult;
      }

      const stripeSub = asStripeSubscription(subscriptionResult.subscription);
      if (!stripeSub) {
        return { success: false, error: "No subscription returned from Stripe" };
      }

      // Update subscription in database
      const subscription = await prisma.subscription.update({
        where: { userId },
        data: {
          stripeSubscriptionId: stripeSub.id,
          status: this.mapStripeStatus(stripeSub.status),
          planId,
          priceId: plan.stripePriceId,
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          trialStart: stripeSub.trial_start
            ? new Date(stripeSub.trial_start * 1000)
            : null,
          trialEnd: stripeSub.trial_end
            ? new Date(stripeSub.trial_end * 1000)
            : null,
        },
      });

      return { success: true, subscription };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async updateSubscription(userId: string, params: Partial<{
    planId: string;
    cancelAtPeriodEnd: boolean;
  }>) {
    try {
      const validation = validateInput(updateSubscriptionSchema, params);
      if (!validation.success) {
        return { success: false, error: 'Invalid input data' };
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription || !subscription.stripeSubscriptionId) {
        return { success: false, error: 'Subscription not found' };
      }

      let updateData: any = {};

      if (params.planId) {
        const plan = await prisma.billingPlan.findUnique({
          where: { id: params.planId },
        });

        if (!plan) {
          return { success: false, error: 'Billing plan not found' };
        }

        updateData.priceId = plan.stripePriceId;
        updateData.planId = params.planId;
      }

      if (params.cancelAtPeriodEnd !== undefined) {
        updateData.cancelAtPeriodEnd = params.cancelAtPeriodEnd;
      }

      // Update Stripe subscription
      const stripeResult = await StripeService.updateSubscription({
        subscriptionId: subscription.stripeSubscriptionId,
        priceId: updateData.priceId,
        cancelAtPeriodEnd: updateData.cancelAtPeriodEnd,
      });

      if (!stripeResult.success) {
        return stripeResult;
      }

      const updatedStripeSub = asStripeSubscription(stripeResult.subscription);
      if (!updatedStripeSub) {
        return { success: false, error: "Missing subscription from Stripe" };
      }

      // Update database
      const updatedSubscription = await prisma.subscription.update({
        where: { userId },
        data: {
          ...updateData,
          status: this.mapStripeStatus(updatedStripeSub.status),
          currentPeriodStart: new Date(
            updatedStripeSub.current_period_start * 1000,
          ),
          currentPeriodEnd: new Date(
            updatedStripeSub.current_period_end * 1000,
          ),
        },
      });

      return { success: true, subscription: updatedSubscription };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async cancelSubscription(userId: string, immediate = false) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription || !subscription.stripeSubscriptionId) {
        return { success: false, error: 'Subscription not found' };
      }

      // Cancel in Stripe
      const stripeResult = await StripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        immediate
      );

      if (!stripeResult.success) {
        return stripeResult;
      }

      const canceledSub = asStripeSubscription(stripeResult.subscription);
      if (!canceledSub) {
        return { success: false, error: "Missing subscription from Stripe" };
      }

      // Update database
      const updatedSubscription = await prisma.subscription.update({
        where: { userId },
        data: {
          status: this.mapStripeStatus(canceledSub.status),
          cancelAtPeriodEnd: canceledSub.cancel_at_period_end,
        },
      });

      return { success: true, subscription: updatedSubscription };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getSubscription(userId: string) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
        include: {
          paymentMethods: true,
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!subscription) {
        return { success: false, error: 'Subscription not found' };
      }

      return { success: true, subscription };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async recordUsage(
    userId: string,
    type: 'GENERATION' | 'API_CALL' | 'STORAGE' | 'BANDWIDTH' | 'SEAT',
    amount: number,
    metadata?: any
  ) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      // Get current period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const usageRecord = await prisma.usageRecord.create({
        data: {
          userId,
          subscriptionId: subscription?.id,
          type,
          amount,
          metadata,
          periodStart,
          periodEnd,
        },
      });

      return { success: true, usageRecord };
    } catch (error) {
      console.error('Error recording usage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getUsageStats(userId: string, periodStart?: Date, periodEnd?: Date) {
    try {
      const usage = await prisma.usageRecord.groupBy({
        by: ['type'],
        where: {
          userId,
          periodStart: periodStart ? { gte: periodStart } : undefined,
          periodEnd: periodEnd ? { lte: periodEnd } : undefined,
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      return { success: true, usage };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async handleWebhookEvent(event: any) {
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling webhook event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private static async handleInvoicePaymentSucceeded(invoice: any) {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });

    if (!subscription) return;

    // Update or create invoice record
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      update: {
        status: 'PAID',
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
      },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        status: 'PAID',
        amount: invoice.total,
        currency: invoice.currency,
        dueDate: new Date(invoice.due_date * 1000),
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
      },
    });

    // Update subscription status if needed
    if (invoice.subscription) {
      const stripeSubscription = await StripeService.getSubscription(
        invoice.subscription as string,
      );
      if (stripeSubscription.success && stripeSubscription.subscription) {
        const sub = asStripeSubscription(stripeSubscription.subscription);
        if (sub) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: this.mapStripeStatus(sub.status),
            },
          });
        }
      }
    }
  }

  private static async handleInvoicePaymentFailed(invoice: any) {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });

    if (!subscription) return;

    // Update invoice record
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      update: { status: 'OPEN' },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        status: 'OPEN',
        amount: invoice.total,
        currency: invoice.currency,
        dueDate: new Date(invoice.due_date * 1000),
      },
    });
  }

  private static async handleSubscriptionCreated(subscription: any) {
    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private static async handleSubscriptionUpdated(subscription: any) {
    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private static async handleSubscriptionDeleted(subscription: any) {
    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: 'CANCELED',
        stripeSubscriptionId: null, // Clear the reference
      },
    });
  }

  private static mapStripeStatus(stripeStatus: string): any {
    const statusMap: Record<string, any> = {
      'trialing': 'TRIALING',
      'active': 'ACTIVE',
      'past_due': 'PAST_DUE',
      'canceled': 'CANCELED',
      'unpaid': 'UNPAID',
      'incomplete': 'INACTIVE',
      'incomplete_expired': 'INACTIVE',
    };
    return statusMap[stripeStatus] || 'INACTIVE';
  }
}
