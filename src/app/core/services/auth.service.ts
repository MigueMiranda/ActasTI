import { Injectable } from '@angular/core';

interface AuthSession {
  username: string;
  token: string;
  issuedAt: number;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly sessionKey = 'actasti_auth_session';
  private readonly sessionDurationMs = 8 * 60 * 60 * 1000;

  login(username: string, password: string): boolean {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      return false;
    }

    const now = Date.now();
    const session: AuthSession = {
      username: cleanUsername,
      token: this.generateToken(),
      issuedAt: now,
      expiresAt: now + this.sessionDurationMs,
    };

    try {
      sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
      return true;
    } catch {
      return false;
    }
  }

  logout(): void {
    sessionStorage.removeItem(this.sessionKey);
  }

  isAuthenticated(): boolean {
    const session = this.getSession();
    if (!session) {
      return false;
    }

    if (Date.now() >= session.expiresAt) {
      this.logout();
      return false;
    }

    return true;
  }

  getUsername(): string | null {
    return this.getSession()?.username ?? null;
  }

  private getSession(): AuthSession | null {
    const raw = sessionStorage.getItem(this.sessionKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthSession>;
      if (!parsed || typeof parsed !== 'object') {
        this.logout();
        return null;
      }

      if (
        typeof parsed.username !== 'string' ||
        typeof parsed.token !== 'string' ||
        typeof parsed.issuedAt !== 'number' ||
        typeof parsed.expiresAt !== 'number' ||
        parsed.expiresAt <= parsed.issuedAt
      ) {
        this.logout();
        return null;
      }

      return parsed as AuthSession;
    } catch {
      this.logout();
      return null;
    }
  }

  private generateToken(): string {
    const bytes = new Uint8Array(16);
    const cryptoApi = globalThis.crypto;

    if (cryptoApi?.getRandomValues) {
      cryptoApi.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }

    return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  }
}
