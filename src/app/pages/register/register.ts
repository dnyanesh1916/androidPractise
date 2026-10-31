import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  form = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  isSubmitting = false;
  message = '';
  isSuccess = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  submitForm() {
    if (this.isSubmitting) {
      return;
    }

    this.message = '';
    this.isSuccess = false;

    if (!this.form.fullName || !this.form.email || !this.form.password || !this.form.confirmPassword) {
      this.message = 'Please fill in all fields.';
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.message = 'Password and confirm password must match.';
      return;
    }

    this.isSubmitting = true;

    const payload = {
      fullName: this.form.fullName.trim(),
      email: this.form.email.trim(),
      password: this.form.password,
      confirmPassword: this.form.confirmPassword
    };

    this.authService.register(payload).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.isSuccess = response?.success ?? true;
        this.message = response?.message || 'Registration successful.';

        if (this.isSuccess) {
          this.form = {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: ''
          };

          this.router.navigateByUrl('/login');
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.isSuccess = false;
        this.message = error?.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
