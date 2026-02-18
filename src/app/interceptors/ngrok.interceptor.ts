import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const ngrokInterceptor: HttpInterceptorFn = (req, next) => {
    const apiOrigin = new URL(environment.API_URL).origin;
    if (!req.url.startsWith(apiOrigin)) {
        return next(req);
    }

    const clonedReq = req.clone({
        setHeaders: {
            'ngrok-skip-browser-warning': 'true'
        }
    });

    return next(clonedReq);
};
