import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  form = {
    email: '',
    password: ''
  };

  isSubmitting = false;
  message = '';
  isSuccess = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  submitForm(): void {
    console.log('[LoginPage] submitForm() called', this.form);

    if (this.isSubmitting) {
      console.log('[LoginPage] submitForm() ignored because already submitting');
      return;
    }

    if (!this.form.email || !this.form.password) {
      this.message = 'Please enter email and password.';
      this.isSuccess = false;
      return;
    }

    this.isSubmitting = true;
    this.message = '';

    this.authService.login(this.form).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response?.message && response.message.toLowerCase().includes('success')) {
          this.isSuccess = true;
          this.message = response.message;
          this.authService.saveUser({
            userId: response.userId,
            fullName: response.fullName,
            email: response.email,
            role: response.role
          });

          const redirectPath = response.role === 'ADMIN' ? '/admin' : '/dashboard';
          this.router.navigateByUrl(redirectPath);
          return;
        }

        this.isSuccess = false;
        this.message = response?.message || 'Login failed.';
      },
      error: (error) => {
        this.isSubmitting = false;
        this.isSuccess = false;
        this.message = error?.error?.message || 'Login failed. Please try again.';
      }
    });
  }
}
