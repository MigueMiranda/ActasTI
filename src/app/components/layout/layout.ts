import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLinkActive,
  RouterLinkWithHref,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLinkActive,
    RouterLinkWithHref
  ],
  templateUrl: './layout.html',
})
export class Layout {
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  userName: string = '';

  sidebarCollapsed = true;
  darkMode = false;
  inventoryMenuOpen = false;

  ngOnInit() {
    const user = this.authService.getUsername() ?? '';
    this.userName = user.trim().split(/\s+/)[0] ?? '';
    this.inventoryMenuOpen = this.isInventorySectionActive();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (this.isInventorySectionActive()) {
          this.inventoryMenuOpen = true;
        }
      });
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleInventoryMenu() {
    this.inventoryMenuOpen = !this.inventoryMenuOpen;
  }

  isInventorySectionActive(): boolean {
    return this.router.url.startsWith('/inventario') || this.router.url.startsWith('/cargue-elementos');
  }

  logout() {
    this.authService.logout();
    localStorage.clear();
    this.router.navigate(['/']);
  }

}
