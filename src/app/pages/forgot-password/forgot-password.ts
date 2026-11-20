import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  form = {
    username: '',
    recoveryCode: '',
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

  submitForm(): void {
    if (this.isSubmitting) {
      return;
    }
    if (this.form.password !== this.form.confirmPassword) {
      this.showMessage('Password and confirm password must match.', false);
      return;
    }

    this.isSubmitting = true;
    this.message = '';
    this.authService.resetPasswordWithCode({
      username: this.form.username.trim(),
      recoveryCode: this.form.recoveryCode.trim().toUpperCase(),
      password: this.form.password,
      confirmPassword: this.form.confirmPassword
    }).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/login', {
          state: {
            username: this.form.username.trim(),
            message: response?.message || 'Password updated. You can now sign in with your new password.',
            isSuccess: true
          }
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        const message = error?.status === 0
          ? 'Unable to connect to the server. Please try again.'
          : error?.error?.message || 'Could not update the password. Check your User ID and recovery code.';
        this.showMessage(message, false);
      }
    });
  }

  private showMessage(message: string, isSuccess: boolean): void {
    this.message = message;
    this.isSuccess = isSuccess;
    this.cdr.detectChanges();
  }
}
