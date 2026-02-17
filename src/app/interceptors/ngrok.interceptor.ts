import { HttpInterceptorFn } from '@angular/common/http';

export const ngrokInterceptor: HttpInterceptorFn = (req, res) => {
    // Agregar header para bypass de ngrok
    const clonedReq = req.clone({
        setHeaders: {
            'ngrok-skip-browser-warning': 'true'
        }
    });

    return res(clonedReq);
};