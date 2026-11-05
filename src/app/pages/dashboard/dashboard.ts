import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';

interface AttendanceCalendarDay {
  date: number;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: 'present' | 'absent' | 'future' | 'outside-month' | 'unknown';
}

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
  calendarMonthDate = new Date();
  calendarDays: AttendanceCalendarDay[] = [];
  attendanceLoadFailed = false;
  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

    const [year, month] = this.currentMonth.split('-').map(Number);
    this.calendarMonthDate = new Date(year, month - 1, 1);
    this.buildAttendanceCalendar();
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
        this.attendanceLoadFailed = false;
        this.buildAttendanceCalendar();
        this.isLoadingAttendance = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.attendanceEntries = [];
        this.attendanceLoadFailed = true;
        this.buildAttendanceCalendar();
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
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  private currentMonthValue(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }

  changeCalendarMonth(offset: number): void {
    this.calendarMonthDate = new Date(
      this.calendarMonthDate.getFullYear(),
      this.calendarMonthDate.getMonth() + offset,
      1
    );
    this.buildAttendanceCalendar();
  }

  private buildAttendanceCalendar(): void {
    const year = this.calendarMonthDate.getFullYear();
    const month = this.calendarMonthDate.getMonth();
    const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
    const today = new Date();
    const todayKey = this.dateKey(today);
    const presentDays = new Set(
      this.attendanceEntries
        .filter(entry => String(entry.status).toUpperCase() === 'PRESENT')
        .map(entry => this.attendanceDateKey(entry.checkInTime))
        .filter((key): key is string => key !== null)
    );

    this.calendarDays = Array.from({ length: cellCount }, (_, index) => {
      const date = new Date(year, month, index - firstDayOffset + 1);
      const key = this.dateKey(date);
      const isCurrentMonth = date.getMonth() === month;
      let status: AttendanceCalendarDay['status'] = 'outside-month';

      if (isCurrentMonth) {
        status = this.attendanceLoadFailed
          ? 'unknown'
          : presentDays.has(key) ? 'present' : key < todayKey ? 'absent' : 'future';
      }

      return {
        date: date.getDate(),
        key,
        isCurrentMonth,
        isToday: key === todayKey,
        status
      };
    });
  }

  private attendanceDateKey(value: unknown): string | null {
    if (typeof value === 'string') {
      const match = value.match(/^\d{4}-\d{2}-\d{2}/);
      return match ? match[0] : null;
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return this.dateKey(value);
    }

    return null;
  }

  private dateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
