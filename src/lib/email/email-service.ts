import nodemailer from 'nodemailer';
import Logger from '@/lib/monitoring/logger';
import { MetricsCollector } from '@/lib/monitoring/metrics';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  template?: string;
  data?: Record<string, any>;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@lovable.ai';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Lovable AI';
    
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      Logger.info('Sending email', {
        to: options.to,
        subject: options.subject,
        template: options.template,
      });

      const mailOptions = {
        from: `${this.fromName} <${options.from || this.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      const duration = Date.now() - startTime;

      MetricsCollector.recordPerformance('email_send', duration);
      Logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
        duration,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      MetricsCollector.recordError('email_send_failed');
      
      Logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
        duration,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendTemplateEmail(options: EmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!options.template) {
      return {
        success: false,
        error: 'Template name is required',
      };
    }

    try {
      const template = await this.getTemplate(options.template);
      const html = this.renderTemplate(template.html, options.data);
      const text = template.text ? this.renderTemplate(template.text, options.data) : undefined;

      return await this.sendEmail({
        ...options,
        subject: this.renderTemplate(template.subject, options.data),
        html,
        text,
      });
    } catch (error) {
      Logger.error('Failed to send template email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        template: options.template,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async getTemplate(templateName: string): Promise<EmailTemplate> {
    // In a real application, this would load from a database or file system
    const templates: Record<string, EmailTemplate> = {
      'welcome': {
        name: 'welcome',
        subject: 'Welcome to Lovable AI! 🎉',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Lovable AI</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Lovable AI, {{firstName}}! 🎉</h1>
                <p>Your AI-powered development journey starts here</p>
              </div>
              <div class="content">
                <p>Hi {{firstName}},</p>
                <p>Thank you for joining Lovable AI! We're excited to have you on board.</p>
                <p>With your new account, you can:</p>
                <ul>
                  <li>Generate code with AI assistance</li>
                  <li>Collaborate with your team in real-time</li>
                  <li>Access advanced analytics and insights</li>
                  <li>Build amazing projects faster than ever</li>
                </ul>
                <p>To get started, simply click the button below:</p>
                <a href="{{dashboardUrl}}" class="button">Go to Dashboard</a>
                <p>If you have any questions, feel free to reach out to our support team.</p>
                <p>Best regards,<br>The Lovable AI Team</p>
              </div>
              <div class="footer">
                <p>This email was sent to {{email}}. You're receiving this because you created an account on Lovable AI.</p>
                <p><a href="{{unsubscribeUrl}}">Unsubscribe</a> | <a href="{{privacyUrl}}">Privacy Policy</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Welcome to Lovable AI, {{firstName}}! 🎉

          Hi {{firstName}},

          Thank you for joining Lovable AI! We're excited to have you on board.

          With your new account, you can:
          - Generate code with AI assistance
          - Collaborate with your team in real-time
          - Access advanced analytics and insights
          - Build amazing projects faster than ever

          To get started, visit: {{dashboardUrl}}

          If you have any questions, feel free to reach out to our support team.

          Best regards,
          The Lovable AI Team

          ---
          This email was sent to {{email}}. You're receiving this because you created an account on Lovable AI.
          Unsubscribe: {{unsubscribeUrl}} | Privacy Policy: {{privacyUrl}}
        `,
      },
      'password-reset': {
        name: 'password-reset',
        subject: 'Reset your Lovable AI password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f8f9fa; padding: 30px; text-align: center; border: 1px solid #e9ecef; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Reset Your Password</h1>
                <p>We received a request to reset your password</p>
              </div>
              <div class="content">
                <p>Hi {{firstName}},</p>
                <p>We received a request to reset your password for your Lovable AI account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{{resetUrl}}" class="button">Reset Password</a>
                <div class="warning">
                  <p><strong>Important:</strong> This link will expire in {{expiresIn}}. If you didn't request a password reset, please ignore this email.</p>
                </div>
                <p>If you have any trouble, please contact our support team.</p>
                <p>Best regards,<br>The Lovable AI Team</p>
              </div>
              <div class="footer">
                <p>This email was sent to {{email}}. You're receiving this because you requested a password reset.</p>
                <p><a href="{{privacyUrl}}">Privacy Policy</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Reset Your Lovable AI Password

          Hi {{firstName}},

          We received a request to reset your password for your Lovable AI account.

          Click the link below to reset your password:
          {{resetUrl}}

          Important: This link will expire in {{expiresIn}}. If you didn't request a password reset, please ignore this email.

          If you have any trouble, please contact our support team.

          Best regards,
          The Lovable AI Team

          ---
          This email was sent to {{email}}. You're receiving this because you requested a password reset.
          Privacy Policy: {{privacyUrl}}
        `,
      },
      'billing-invoice': {
        name: 'billing-invoice',
        subject: 'Your Lovable AI Invoice #{{invoiceId}}',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice #{{invoiceId}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: white; padding: 30px; border: 1px solid #e9ecef; border-top: none; }
              .invoice-details { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
              .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .total { font-size: 24px; font-weight: bold; color: #28a745; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Invoice #{{invoiceId}}</h1>
                <p>Thank you for your business!</p>
              </div>
              <div class="content">
                <p>Hi {{firstName}},</p>
                <p>Your invoice is ready. Here are the details:</p>
                <div class="invoice-details">
                  <p><strong>Invoice Number:</strong> #{{invoiceId}}</p>
                  <p><strong>Date:</strong> {{date}}</p>
                  <p><strong>Due Date:</strong> {{dueDate}}</p>
                  <p><strong>Amount:</strong> <span class="total">${{amount}}</span></p>
                  <p><strong>Status:</strong> {{status}}</p>
                </div>
                <p>You can view and download your invoice from your dashboard:</p>
                <a href="{{invoiceUrl}}" class="button">View Invoice</a>
                <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
                <p>Best regards,<br>The Lovable AI Team</p>
              </div>
              <div class="footer">
                <p>This email was sent to {{email}}.</p>
                <p><a href="{{privacyUrl}}">Privacy Policy</a></p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Your Lovable AI Invoice #{{invoiceId}}

          Hi {{firstName}},

          Your invoice is ready. Here are the details:

          Invoice Number: #{{invoiceId}}
          Date: {{date}}
          Due Date: {{dueDate}}
          Amount: ${{amount}}
          Status: {{status}}

          You can view and download your invoice from your dashboard:
          {{invoiceUrl}}

          If you have any questions about this invoice, please don't hesitate to contact us.

          Best regards,
          The Lovable AI Team

          ---
          This email was sent to {{email}}.
          Privacy Policy: {{privacyUrl}}
        `,
      },
    };

    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }

    return template;
  }

  private renderTemplate(template: string, data?: Record<string, any>): string {
    if (!data) return template;

    let rendered = template;
    
    // Simple template rendering - replace {{variable}} with actual values
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, String(value));
    });

    return rendered;
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    try {
      const result = await this.sendTemplateEmail({
        to: email,
        template: 'welcome',
        data: {
          firstName,
          email,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${email}`,
          privacyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/privacy`,
        },
      });

      return result.success;
    } catch (error) {
      Logger.error('Failed to send welcome email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<boolean> {
    try {
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;
      
      const result = await this.sendTemplateEmail({
        to: email,
        template: 'password-reset',
        data: {
          firstName,
          email,
          resetUrl,
          expiresIn: '1 hour',
          privacyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/privacy`,
        },
      });

      return result.success;
    } catch (error) {
      Logger.error('Failed to send password reset email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      return false;
    }
  }

  async sendBillingInvoiceEmail(
    email: string,
    firstName: string,
    invoiceId: string,
    amount: string,
    dueDate: string,
    status: string
  ): Promise<boolean> {
    try {
      const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing/invoices/${invoiceId}`;
      
      const result = await this.sendTemplateEmail({
        to: email,
        template: 'billing-invoice',
        data: {
          firstName,
          email,
          invoiceId,
          date: new Date().toLocaleDateString(),
          dueDate,
          amount,
          status,
          invoiceUrl,
          privacyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/privacy`,
        },
      });

      return result.success;
    } catch (error) {
      Logger.error('Failed to send billing invoice email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        invoiceId,
      });
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      Logger.error('Email service connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async healthCheck(): Promise<{
    connected: boolean;
    service: string;
    lastCheck: string;
  }> {
    const isConnected = await this.verifyConnection();
    
    return {
      connected: isConnected,
      service: 'SMTP',
      lastCheck: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const emailService = new EmailService();
