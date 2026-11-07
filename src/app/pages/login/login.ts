import { ChangeDetectorRef, Component } from '@angular/core';
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
    username: '',
    password: ''
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

  ngOnInit(): void {
    const state = (typeof history !== 'undefined' ? (history.state ?? {}) : {}) as {
      message?: string;
      isSuccess?: boolean;
      username?: string;
    };
    if (state.username) {
      this.form.username = state.username;
    }
    if (state.message) {
      this.showAlert(state.message, state.isSuccess ?? true);
    }
  }

  submitForm(): void {
    console.log('[LoginPage] submitForm() called', this.form);

    if (this.isSubmitting) {
      console.log('[LoginPage] submitForm() ignored because already submitting');
      return;
    }

    if (!this.form.username || !this.form.password) {
      this.showAlert('Please enter your username and password.', false);
      return;
    }

    this.isSubmitting = true;
    this.message = '';

    this.authService.login(this.form).subscribe({
      next: (response) => {
        const backendMessage = response?.message || 'Login successful.';
        const isSuccess = Boolean(response?.message && response.message.toLowerCase().includes('success'));

        this.isSubmitting = false;
        this.showAlert(backendMessage, isSuccess);

        if (isSuccess) {
          this.authService.saveUser({
            userId: response.userId,
            fullName: response.fullName,
            username: response.username || `user${response.userId}`,
            role: response.role,
            profileImage: response.profileImage
          });

          const redirectPath = response.role === 'ADMIN' ? '/admin' : '/attendance';
          setTimeout(() => {
            this.router.navigateByUrl(redirectPath);
          }, 1200);
          return;
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        const message = error?.status === 0
          ? 'Unable to connect to the server. Please check that it is running and try again.'
          : error?.error?.message || 'Login failed. Please try again.';
        this.showAlert(message, false);
      }
    });
  }
}
