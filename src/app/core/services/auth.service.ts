import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { tap } from 'rxjs';

interface AuthSession {
  username: string;
  token: string;
  name: string,
  cargo: string,
  issuedAt: number;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/auth`;

  private readonly sessionKey = 'actasti_auth_session';
  private readonly sessionDurationMs = 8 * 60 * 60 * 1000;
  private user = {};

  login(username: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap(res => {
          const session = {
            username,
            token: res.token,
            issuedAt: Date.now(),
            expiresAt: Date.now() + this.sessionDurationMs
          };

          sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
        })
      );
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
