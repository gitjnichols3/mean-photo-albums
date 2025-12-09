import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // Blocks access to protected routes unless a valid login token exists
  canActivate(): boolean {
    const token = this.authService.getToken();

    if (token) {
      return true;
    }

    // Not authenticated → send user back to the login screen
    this.router.navigate(['/login']);
    return false;
  }
}
