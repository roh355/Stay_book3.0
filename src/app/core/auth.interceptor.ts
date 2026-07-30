import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'staybook.token';

/** Attach the Bearer token to same-origin /api requests. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && req.url.startsWith('/api')) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req);
};
