import { Injectable } from '@angular/core';

import { UserModel } from './../models/users.model';
import { USER_MOCK } from '../mocks/users.mock';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  
  getByUsuario(usuario: string): UserModel | undefined {
    return USER_MOCK.find(
      r => r.usuario.toLowerCase() === usuario.toLowerCase()
    );
  }

}
