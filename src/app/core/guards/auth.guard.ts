import { Injectable, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate, CanActivateChild {
  private authService = inject(AuthService);
  private router = inject(Router);

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    return this.validateSession(state.url);
  }

  canActivateChild(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    return this.validateSession(state.url);
  }

  private validateSession(redirectUrl: string): boolean | UrlTree {
    if (this.authService.isAuthenticated()) {
      return true;
    }

    return this.router.createUrlTree(['/'], {
      queryParams: { redirect: redirectUrl || '/inicio' },
    });
  }
}
