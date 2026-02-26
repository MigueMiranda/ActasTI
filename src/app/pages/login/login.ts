import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {

  // Inyecto el router
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private notifications = inject(NotificationService);

  // Creo las variables para el login
  usuario: string = '';
  password: string = '';
  mensaje_error: string = '';

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/inicio']);
    }
  }

  // Creo el método para el login
  login() {
    const usuario = this.usuario.trim();

    if (!usuario || !this.password) {
      this.mensaje_error = 'Usuario o contraseña incorrectos';
      this.notifications.error(this.mensaje_error);
      return;
    }

    this.authService.login(usuario, this.password)
      .subscribe({
        next: () => {
          this.notifications.success('Inicio de sesión exitoso');
          const redirect = this.route.snapshot.queryParamMap.get('redirect');

          this.router.navigateByUrl(
            this.isSafeRedirect(redirect) ? redirect : '/inicio'
          );

        },
        error: (err) => {
          this.mensaje_error = err?.status === 401
            ? 'Usuario o contraseña incorrectos'
            : 'No fue posible iniciar sesión';
          this.notifications.error(this.mensaje_error);
        }
      });
  }


  private isSafeRedirect(redirect: string | null): redirect is string {
    return !!redirect && redirect.startsWith('/') && !redirect.startsWith('//');
  }

}
