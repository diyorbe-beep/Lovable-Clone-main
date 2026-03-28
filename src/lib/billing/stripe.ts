import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

export interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  paymentMethodId: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentParams {
  customerId: string;
  amount: number;
  currency?: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

export class StripeService {
  static async createCustomer(params: CreateCustomerParams) {
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });
      return { success: true, customer };
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getCustomer(customerId: string) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return { success: true, customer };
    } catch (error) {
      console.error('Error retrieving Stripe customer:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async updateCustomer(customerId: string, params: Partial<CreateCustomerParams>) {
    try {
      const customer = await stripe.customers.update(customerId, {
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });
      return { success: true, customer };
    } catch (error) {
      console.error('Error updating Stripe customer:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async createSubscription(params: CreateSubscriptionParams) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: params.trialPeriodDays,
        metadata: params.metadata,
      });
      return { success: true, subscription };
    } catch (error) {
      console.error('Error creating Stripe subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent', 'customer'],
      });
      return { success: true, subscription };
    } catch (error) {
      console.error('Error retrieving Stripe subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async updateSubscription(params: UpdateSubscriptionParams) {
    try {
      const updateData: any = {};
      
      if (params.priceId) {
        const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
        updateData.items = [{
          id: subscription.items.data[0].id,
          price: params.priceId,
        }];
      }
      
      if (params.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = params.cancelAtPeriodEnd;
      }
      
      if (params.metadata) {
        updateData.metadata = params.metadata;
      }

      const subscription = await stripe.subscriptions.update(
        params.subscriptionId,
        updateData
      );
      
      return { success: true, subscription };
    } catch (error) {
      console.error('Error updating Stripe subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async cancelSubscription(subscriptionId: string, immediate = false) {
    try {
      const subscription = immediate
        ? await stripe.subscriptions.cancel(subscriptionId)
        : await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
          });
      
      return { success: true, subscription };
    } catch (error) {
      console.error('Error canceling Stripe subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async createPaymentIntent(params: CreatePaymentIntentParams) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        customer: params.customerId,
        amount: params.amount,
        currency: params.currency || 'usd',
        payment_method: params.paymentMethodId,
        metadata: params.metadata,
        confirm: params.paymentMethodId ? true : false,
        automatic_payment_methods: { enabled: true },
      });
      return { success: true, paymentIntent };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return { success: true, paymentIntent };
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      return { success: true, paymentMethod };
    } catch (error) {
      console.error('Error attaching payment method:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async detachPaymentMethod(paymentMethodId: string) {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      return { success: true, paymentMethod };
    } catch (error) {
      console.error('Error detaching payment method:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async listPaymentMethods(customerId: string, type?: string) {
    try {
      const paymentMethods = await stripe.customers.listPaymentMethods(customerId, {
        type: type as any,
      });
      return { success: true, paymentMethods: paymentMethods.data };
    } catch (error) {
      console.error('Error listing payment methods:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async createInvoice(customerId: string, metadata?: Record<string, string>) {
    try {
      const invoice = await stripe.invoices.create({
        customer: customerId,
        metadata,
      });
      return { success: true, invoice };
    } catch (error) {
      console.error('Error creating invoice:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getInvoice(invoiceId: string) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return { success: true, invoice };
    } catch (error) {
      console.error('Error retrieving invoice:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async listInvoices(customerId: string, limit = 10) {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
      });
      return { success: true, invoices: invoices.data };
    } catch (error) {
      console.error('Error listing invoices:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async constructWebhookEvent(payload: string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      return { success: true, event };
    } catch (error) {
      console.error('Error constructing webhook event:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getPrices(activeOnly = true) {
    try {
      const prices = await stripe.prices.list({
        active: activeOnly,
        expand: ['data.product'],
      });
      return { success: true, prices: prices.data };
    } catch (error) {
      console.error('Error retrieving prices:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getProduct(productId: string) {
    try {
      const product = await stripe.products.retrieve(productId);
      return { success: true, product };
    } catch (error) {
      console.error('Error retrieving product:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export default stripe;
