import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly HEADER_NAME = 'X-CSRF-Token';
  private static readonly COOKIE_NAME = 'csrf-token';
  private static readonly TOKEN_EXPIRY = 60 * 60 * 24; // 24 hours

  static generateToken(): string {
    return randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  static setTokenCookie(response: NextResponse, token: string): void {
    response.cookies.set(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.TOKEN_EXPIRY,
      path: '/',
    });
  }

  static getTokenFromCookie(request: NextRequest): string | undefined {
    return request.cookies.get(this.COOKIE_NAME)?.value;
  }

  static getTokenFromHeader(request: NextRequest): string | undefined {
    return request.headers.get(this.HEADER_NAME) || undefined;
  }

  static validateToken(cookieToken?: string, headerToken?: string): boolean {
    if (!cookieToken || !headerToken) {
      return false;
    }
    return cookieToken === headerToken;
  }

  static async middleware(request: NextRequest): Promise<{
    isValid: boolean;
    token?: string;
    error?: string;
  }> {
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const token = this.getTokenFromCookie(request) || this.generateToken();
      return { isValid: true, token };
    }

    // Validate CSRF for state-changing requests
    const cookieToken = this.getTokenFromCookie(request);
    const headerToken = this.getTokenFromHeader(request);

    if (!this.validateToken(cookieToken, headerToken)) {
      return {
        isValid: false,
        error: 'Invalid CSRF token',
      };
    }

    return { isValid: true, token: cookieToken };
  }
}
