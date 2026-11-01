import { ChangeDetectorRef, Component } from '@angular/core';
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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  private showAlert(message: string, isSuccess: boolean): void {
    this.message = message;
    this.isSuccess = isSuccess;
    this.cdr.detectChanges();
  }

  submitForm() {
    if (this.isSubmitting) {
      return;
    }

    this.showAlert('', false);

    if (!this.form.fullName || !this.form.email || !this.form.password || !this.form.confirmPassword) {
      this.showAlert('Please fill in all fields.', false);
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.showAlert('Password and confirm password must match.', false);
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
        const backendMessage = response?.message || 'Registration successful.';
        const isSuccess = response?.success ?? true;

        this.isSubmitting = false;
        this.showAlert(backendMessage, isSuccess);

        if (isSuccess) {
          this.form = {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: ''
          };

          setTimeout(() => {
            this.router.navigateByUrl('/login');
          }, 1200);
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.showAlert(error?.error?.message || error?.message || 'Registration failed. Please try again.', false);
      }
    });
  }
}
