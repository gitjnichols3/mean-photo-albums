// src/app/components/auth/register/register.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';


import { AuthService } from '../../../services/auth.service';



@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const trimmedName = this.name.trim();
    const trimmedEmail = this.email.trim();

    if (!trimmedName || !trimmedEmail || !this.password || !this.confirmPassword) {
      this.errorMessage = 'All fields are required';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isLoading = true;

    this.authService.register(trimmedName, trimmedEmail, this.password).subscribe({
      next: () => {
        // Option 1: Auto-login after successful registration
        this.authService.login(trimmedEmail, this.password).subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/albums']);
          },
          error: (err) => {
            console.error('Auto-login after register failed:', err);
            this.isLoading = false;
            this.successMessage = 'Account created. Please sign in.';
            this.router.navigate(['/login']);
          }
        });
      },
      error: (err) => {
        console.error('Register error:', err);
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Registration failed';
      }
    });
  }
}
