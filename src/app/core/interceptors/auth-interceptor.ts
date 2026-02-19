import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = environment.API_URL;
  const apiOrigin = getOrigin(apiUrl);

  const shouldAttachToken = req.url.startsWith(apiUrl)
    || (apiOrigin !== '' && req.url.startsWith(apiOrigin));

  if (!shouldAttachToken) {
    return next(req);
  }

  const session = sessionStorage.getItem('actasti_auth_session');

  if (session) {
    try {
      const parsed = JSON.parse(session) as { token?: string };
      const token = normalizeToken(parsed.token);

      if (token) {
        req = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch {
      sessionStorage.removeItem('actasti_auth_session');
    }
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
