import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';

interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  profileImage?: string | null;
  monthlySalary: number | null;
  workingDaysThisMonth: number;
  active: boolean;
  source: string;
  createdAt?: string | null;
}

interface AttendanceLocation {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  active: boolean;
}

type AdminSection = 'users' | 'locations';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  summary: any = { totalUsers: 0, totalPresent: 0, totalLate: 0, totalAbsent: 0 };
  users: AdminUser[] = [];
  locations: AttendanceLocation[] = [];
  activity: any[] = [];
  user: any = null;
  activeSection: AdminSection = 'users';
  isLoading = false;
  isSavingLocation = false;
  isSavingSalaryFor: number | null = null;
  isApprovingUserId: number | null = null;
  salaryDrafts: Record<number, number | null> = {};
  selectedMonth = this.currentMonthValue();
  message = '';
  isError = false;
  editingLocationId: number | null = null;
  locationForm = this.emptyLocationForm();

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    if (!this.user || this.user.role !== 'ADMIN') {
      this.router.navigateByUrl('/login');
      return;
    }

    this.loadData();
  }

  get pendingUsers(): number {
    return this.users.filter(user => user.role === 'USER' && !user.active).length;
  }

  showSection(section: AdminSection): void {
    this.activeSection = section;
    this.message = '';
  }

  loadData(): void {
    this.isLoading = true;
    this.attendanceService.getAdminSummary().subscribe({
      next: (response) => this.summary = response || this.summary,
      error: () => this.showMessage('Could not load the attendance summary.', true)
    });
    this.loadUsers();
    this.loadLocations();
    this.attendanceService.getAdminActivity().subscribe({
      next: (response) => this.activity = response || [],
      error: () => this.activity = []
    });
  }

  loadUsers(): void {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    this.attendanceService.getAdminUsers(year, month).subscribe({
      next: (response) => {
        this.users = response || [];
        this.salaryDrafts = Object.fromEntries(this.users.map(account => [account.id, account.monthlySalary]));
        this.isLoading = false;
      },
      error: (error) => {
        this.users = [];
        this.isLoading = false;
        this.showMessage(error?.error?.message || 'Could not load registered users.', true);
      }
    });
  }

  onMonthChanged(): void {
    this.loadUsers();
  }

  saveSalary(account: AdminUser): void {
    const monthlySalary = this.salaryDrafts[account.id];
    if (monthlySalary === null || monthlySalary === undefined || !Number.isFinite(Number(monthlySalary)) || Number(monthlySalary) < 0) {
      this.showMessage('Enter a valid non-negative monthly salary.', true);
      return;
    }

    this.isSavingSalaryFor = account.id;
    this.attendanceService.updateUserSalary(account.id, Number(monthlySalary)).subscribe({
      next: (response) => {
        account.monthlySalary = response.monthlySalary;
        this.salaryDrafts[account.id] = response.monthlySalary;
        this.isSavingSalaryFor = null;
        this.showMessage(`Monthly salary updated for ${account.fullName}.`, false);
        this.attendanceService.getAdminActivity().subscribe({ next: (items) => this.activity = items || [] });
      },
      error: (error) => {
        this.isSavingSalaryFor = null;
        this.showMessage(error?.error?.message || 'Could not update monthly salary.', true);
      }
    });
  }

  loadLocations(): void {
    this.attendanceService.getLocations().subscribe({
      next: (response) => this.locations = response || [],
      error: (error) => this.showMessage(error?.error?.message || 'Could not load attendance locations.', true)
    });
  }

  approveUser(user: AdminUser): void {
    this.isApprovingUserId = user.id;
    this.attendanceService.approveUser(user.id, user.source || 'USER', this.salaryDrafts[user.id]).subscribe({
      next: (approvedUser) => {
        user.active = approvedUser.active;
        user.monthlySalary = approvedUser.monthlySalary;
        this.salaryDrafts[user.id] = approvedUser.monthlySalary;
        this.isApprovingUserId = null;
        this.showMessage(this.salaryDrafts[user.id] === null
          ? `${user.fullName} is approved and can now log in.`
          : `${user.fullName} is approved with the assigned monthly salary.`, false);
        this.loadUsers();
        this.attendanceService.getAdminActivity().subscribe({ next: (items) => this.activity = items || [] });
      },
      error: (error) => {
        this.isApprovingUserId = null;
        this.showMessage(error?.error?.message || 'Could not approve this registration.', true);
      }
    });
  }

  editLocation(location: AttendanceLocation): void {
    this.editingLocationId = location.id;
    this.locationForm = {
      name: location.name,
      address: location.address || '',
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: location.radiusMeters,
      active: location.active
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  saveLocation(): void {
    if (this.isSavingLocation) {
      return;
    }

    this.isSavingLocation = true;
    const request = this.editingLocationId === null
      ? this.attendanceService.createLocation(this.locationForm)
      : this.attendanceService.updateLocation(this.editingLocationId, this.locationForm);

    request.subscribe({
      next: () => {
        this.isSavingLocation = false;
        this.showMessage(this.editingLocationId === null ? 'Attendance location added.' : 'Attendance location updated.', false);
        this.resetLocationForm();
        this.loadLocations();
        this.attendanceService.getAdminActivity().subscribe({ next: (items) => this.activity = items || [] });
      },
      error: (error) => {
        this.isSavingLocation = false;
        this.showMessage(error?.error?.message || 'Could not save this location.', true);
      }
    });
  }

  deactivateLocation(location: AttendanceLocation): void {
    this.attendanceService.deactivateLocation(location.id).subscribe({
      next: () => {
        this.showMessage(`${location.name} was deactivated.`, false);
        this.loadLocations();
      },
      error: (error) => this.showMessage(error?.error?.message || 'Could not deactivate this location.', true)
    });
  }

  resetLocationForm(): void {
    this.editingLocationId = null;
    this.locationForm = this.emptyLocationForm();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  private showMessage(message: string, isError: boolean): void {
    this.message = message;
    this.isError = isError;
  }

  private emptyLocationForm() {
    return {
      name: '',
      address: '',
      latitude: null as number | null,
      longitude: null as number | null,
      radiusMeters: 200,
      active: true
    };
  }

  private currentMonthValue(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
}
