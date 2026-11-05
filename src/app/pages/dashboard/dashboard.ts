import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  user: any = null;
  compensation: any = null;
  attendanceEntries: any[] = [];
  isLoadingCompensation = false;
  isLoadingAttendance = false;
  message = '';
  isError = false;
  currentMonth = this.currentMonthValue();

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user) {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadCompensation();
    this.loadAttendance();
  }

  loadCompensation(): void {
    const [year, month] = this.currentMonth.split('-').map(Number);
    this.isLoadingCompensation = true;
    this.attendanceService.getUserCompensation(this.user.userId, year, month).subscribe({
      next: (summary) => {
        this.compensation = summary;
        this.isLoadingCompensation = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoadingCompensation = false;
        this.showMessage(error?.error?.message || 'Could not load compensation details.', true);
      }
    });
  }

  loadAttendance(): void {
    this.isLoadingAttendance = true;
    this.attendanceService.getUserAttendance(this.user.userId).subscribe({
      next: (entries) => {
        this.attendanceEntries = entries || [];
        this.isLoadingAttendance = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.attendanceEntries = [];
        this.isLoadingAttendance = false;
        this.showMessage(error?.error?.message || 'Could not load attendance history.', true);
      }
    });
  }

  private showMessage(message: string, isError: boolean): void {
    this.message = message;
    this.isError = isError;
    this.cdr.detectChanges();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  private currentMonthValue(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
}
