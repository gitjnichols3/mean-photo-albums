// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Base URL for all authentication-related API calls
  private apiUrl = `${environment.apiBaseUrl}/auth`;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Log the user in and persist the JWT + user info for future requests
  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((res) => {
          // Persist authentication state across page reloads
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
        })
      );
  }

  // Register a new user account
  register(
    name: string,
    email: string,
    password: string
  ): Observable<{ message: string; user: { id: string; name: string; email: string } }> {
    return this.http.post<{ message: string; user: { id: string; name: string; email: string } }>(
      `${this.apiUrl}/register`,
      { name, email, password }
    );
  }

  // Clear authentication state and return the user to the login screen
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  // Retrieve the stored JWT for authenticated API requests
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Quick boolean check used by guards and UI
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Return the currently logged-in user from localStorage (if present)
  getCurrentUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }
}
