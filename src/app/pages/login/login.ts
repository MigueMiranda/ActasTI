import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  // Inyecto el router
  private router = inject(Router);
  
  // Creo las variables para el login
  usuario: string = '';
  password: string = '';
  mensaje_error: string = '';

  // Creo el método para el login
  login() {
    if (this.usuario && this.password) {
      localStorage.setItem('auth', 'true'); //simular el token
      this.router.navigate(['/inicio']); //redireccionar a inicio  
    }
    else {
      this.mensaje_error = 'Usuario o contraseña incorrectos';
    }
  }


}
