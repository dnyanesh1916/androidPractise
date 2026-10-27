import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule],
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

  constructor(private http: HttpClient) {}

  submitForm() {
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

    this.http.post<{ success: boolean; message: string; userId: number | null }>('http://localhost:8080/api/register', this.form)
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.isSuccess = response.success;
          this.message = response.message;

          if (response.success) {
            this.form = {
              fullName: '',
              email: '',
              password: '',
              confirmPassword: ''
            };
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
