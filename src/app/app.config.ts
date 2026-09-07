import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, APP_INITIALIZER } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { ThemeService } from './core/services/theme.service';

function initTheme() {
  return () => {
    // ThemeService se inicializa automáticamente por providedIn: 'root'
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    importProvidersFrom(MatSnackBarModule),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initTheme,
      multi: true
    }
  ]
};
