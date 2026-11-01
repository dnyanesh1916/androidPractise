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
    email: '',
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
    const state = (typeof history !== 'undefined' ? (history.state ?? {}) : {}) as { message?: string; isSuccess?: boolean };
    if (state.message) {
      this.showAlert(state.message, Boolean(state.isSuccess));
    }
  }

  submitForm(): void {
    console.log('[LoginPage] submitForm() called', this.form);

    if (this.isSubmitting) {
      console.log('[LoginPage] submitForm() ignored because already submitting');
      return;
    }

    if (!this.form.email || !this.form.password) {
      this.showAlert('Please enter email and password.', false);
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
            email: response.email,
            role: response.role,
            profileImage: response.profileImage
          });

          const redirectPath = response.role === 'ADMIN' ? '/admin' : '/dashboard';
          setTimeout(() => {
            this.router.navigateByUrl(redirectPath);
          }, 1200);
          return;
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.showAlert(error?.error?.message || error?.message || 'Login failed. Please try again.', false);
      }
    });
  }
}
