import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../../environments/environment';
import { Observable } from 'rxjs';

import { UserModel } from './../models/users.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.API_URL}/users`;

  getAll() {
    return this.http.get<UserModel[]>(this.apiUrl)
  }

  getByUsername(username: string): Observable<UserModel> {
    const safeUsername = encodeURIComponent(username.trim());
    return this.http.get<UserModel>(`${this.apiUrl}/${safeUsername}`);
  }

}
