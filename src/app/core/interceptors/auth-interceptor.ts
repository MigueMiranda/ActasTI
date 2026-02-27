import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const apiUrl = environment.API_URL;
  const apiOrigin = getOrigin(apiUrl);
  const normalizedApiUrl = normalizeUrl(apiUrl);
  const normalizedReqUrl = normalizeUrl(req.url);

  const shouldAttachToken = req.url.startsWith(apiUrl)
    || (apiOrigin !== '' && req.url.startsWith(apiOrigin));

  const isLoginRequest = normalizedReqUrl === `${normalizedApiUrl}/auth/login`;
  if (!shouldAttachToken || isLoginRequest || req.headers.has('Authorization')) {
    return next(req);
  }

  const token = normalizeToken(authService.getToken());
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req);
};

function normalizeToken(rawToken: unknown): string {
  if (typeof rawToken !== 'string') {
    return '';
  }

  const trimmed = rawToken.trim();
  if (!trimmed) {
    return '';
  }

  const unquoted = trimmed.replace(/^["']|["']$/g, '');
  return unquoted.replace(/^bearer\s+/i, '').trim();
}

function getOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
