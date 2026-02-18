import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

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
      return;
    }

    this.authService.login(usuario, this.password)
      .subscribe({
        next: (data) => {

          console.log(data)

          const now = Date.now();
          const session = {
            username: usuario,
            token: data.token,
            issuedAt: now,
            expiresAt: now + 8 * 60 * 60 * 1000
          };

          sessionStorage.setItem('actasti_auth_session', JSON.stringify(session));

          const redirect = this.route.snapshot.queryParamMap.get('redirect');

          this.router.navigateByUrl(
            this.isSafeRedirect(redirect) ? redirect : '/inicio'
          );

        },
        error: () => {
          this.mensaje_error = 'No fue posible iniciar sesión';
        }
      });
  }


  private isSafeRedirect(redirect: string | null): redirect is string {
    return !!redirect && redirect.startsWith('/') && !redirect.startsWith('//');
  }

}
