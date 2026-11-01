import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;

  user: any = null;
  locationText = 'Waiting for location...';
  attendanceStatus = 'Not yet marked';
  faceData = '';
  latitude: number | null = null;
  longitude: number | null = null;
  todayEntries: any[] = [];
  isSubmitting = false;
  isLoading = false;
  isCameraOpen = false;
  isCameraLoading = false;
  message = '';
  isSuccess = false;
  private cameraStream: MediaStream | null = null;

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
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
      this.attendanceStatus = state.message;
      this.showAlert(state.message, Boolean(state.isSuccess));
    }

    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadTodayAttendance();
  }

  ngOnDestroy(): void {
    this.closeCamera();
  }

  loadTodayAttendance(): void {
    this.isLoading = true;
    this.attendanceService.getUserAttendance(this.user.userId).subscribe({
      next: (response) => {
        this.todayEntries = response || [];
        this.isLoading = false;
      },
      error: () => {
        this.todayEntries = [];
        this.isLoading = false;
      }
    });
  }

  requestLocation(): void {
    if (!navigator.geolocation) {
      this.locationText = 'Geolocation not supported by this browser';
      this.showAlert('Geolocation not supported by this browser', false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.locationText = `Lat: ${position.coords.latitude.toFixed(4)} | Lng: ${position.coords.longitude.toFixed(4)}`;
        this.showAlert('Location access granted successfully.', true);
      },
      () => {
        this.locationText = 'Location permission denied';
        this.showAlert('Location permission denied. Please allow location access.', false);
      }
    );
  }

  openCamera(): void {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.attendanceStatus = 'Camera is not supported on this device';
      this.showAlert('Camera is not supported on this device', false);
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
        const video = this.cameraVideo?.nativeElement;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => undefined);
        }
      });
    }).catch(() => {
      this.isCameraLoading = false;
      this.attendanceStatus = 'Camera permission denied. Please allow camera access.';
      this.showAlert('Camera permission denied. Please allow camera access.', false);
    });
  }

  capturePhoto(): void {
    const video = this.cameraVideo?.nativeElement;
    if (!video || !this.cameraStream) {
      this.attendanceStatus = 'Please open the camera first.';
      this.showAlert('Please open the camera first.', false);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const context = canvas.getContext('2d');
    if (!context) {
      this.attendanceStatus = 'Unable to capture photo from camera.';
      this.showAlert('Unable to capture photo from camera.', false);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.faceData = canvas.toDataURL('image/jpeg', 0.9);
    this.attendanceStatus = 'Live photo captured successfully';
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

  onFaceSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.faceData = String(reader.result || '');
      this.attendanceStatus = 'Photo selected from device';
    };
    reader.readAsDataURL(file);
  }

  markAttendance(type: 'CHECK_IN' | 'CHECK_OUT'): void {
    if (!this.user) {
      return;
    }

    if (!this.latitude || !this.longitude) {
      this.locationText = 'Please allow location access before marking attendance.';
      this.showAlert('Please allow location access before marking attendance.', false);
      return;
    }

    if (!this.faceData) {
      this.attendanceStatus = 'Please capture a live photo before marking attendance.';
      this.showAlert('Please capture a live photo before marking attendance.', false);
      return;
    }

    this.isSubmitting = true;

    this.attendanceService.markAttendance({
      userId: this.user.userId,
      latitude: this.latitude,
      longitude: this.longitude,
      attendanceType: type,
      faceImageBase64: this.faceData
    }).subscribe({
      next: (response) => {
        const backendMessage = response?.message || `${type === 'CHECK_IN' ? 'Check-in' : 'Check-out'} successful`;
        this.isSubmitting = false;
        this.attendanceStatus = backendMessage;
        this.showAlert(backendMessage, true);
        this.loadTodayAttendance();
      },
      error: (error) => {
        const backendMessage = error?.error?.message || error?.message || 'Attendance request failed';
        this.isSubmitting = false;
        this.attendanceStatus = backendMessage;
        this.showAlert(backendMessage, false);
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
