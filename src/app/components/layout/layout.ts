import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLinkWithHref, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';


@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLinkActive,
    RouterLinkWithHref
],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  private authService = inject(AuthService);
  private router = inject(Router);

  sidebarCollapsed = true;
  darkMode = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleDark() {
    this.darkMode = !this.darkMode;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

}
