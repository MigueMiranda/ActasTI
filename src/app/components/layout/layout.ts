import { Component } from '@angular/core';
import { RouterOutlet, RouterLinkWithHref, RouterLinkActive } from '@angular/router';


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

  sidebarCollapsed = true;
  darkMode = false;

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleDark() {
    this.darkMode = !this.darkMode;
  }

}
