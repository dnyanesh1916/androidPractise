import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
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
  @ViewChild('registerCameraVideo') registerCameraVideo?: ElementRef<HTMLVideoElement>;

  form = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  isSubmitting = false;
  isCameraOpen = false;
  isCameraLoading = false;
  profileImage = '';
  message = '';
  isSuccess = false;
  private cameraStream: MediaStream | null = null;

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

  openCamera(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.showAlert('Camera is not supported on this device.', false);
      return;
    }

    this.isCameraLoading = true;
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    }).then((stream) => {
      this.cameraStream = stream;
      this.isCameraOpen = true;
      this.isCameraLoading = false;

      setTimeout(() => {
        const video = this.registerCameraVideo?.nativeElement;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => undefined);
        }
      });
    }).catch(() => {
      this.isCameraLoading = false;
      this.showAlert('Camera permission denied. Please allow camera access.', false);
    });
  }

  capturePhoto(): void {
    const video = this.registerCameraVideo?.nativeElement;
    if (!video || !this.cameraStream) {
      this.showAlert('Please open the camera first.', false);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const context = canvas.getContext('2d');
    if (!context) {
      this.showAlert('Unable to capture photo from camera.', false);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.profileImage = canvas.toDataURL('image/jpeg', 0.9);
    this.showAlert('Live photo captured successfully.', true);
    this.closeCamera();
  }

  closeCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.isCameraOpen = false;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.profileImage = String(reader.result || '');
      this.showAlert('Photo selected successfully.', true);
    };
    reader.readAsDataURL(file);
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

    if (!this.profileImage) {
      this.showAlert('Please capture or upload a profile photo.', false);
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
      confirmPassword: this.form.confirmPassword,
      profileImage: this.profileImage
    };

    this.authService.register(payload).subscribe({
      next: (response) => {
        const backendMessage = response?.message || 'Registration successful.';
        const isSuccess = response?.message ? response.message.toLowerCase().includes('success') : true;

        this.isSubmitting = false;
        this.showAlert(backendMessage, isSuccess);

        if (isSuccess) {
          this.form = {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: ''
          };
          this.profileImage = '';

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
