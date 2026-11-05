import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  dailySalary: number | null;
  monthlyAdvance: number | null;
  workingDaysThisMonth: number;
  scheduledWorkingDaysThisMonth: number;
  earnedPayThisMonth: number | null;
  salaryPaidThisMonth: number;
  totalBalanceThisMonth: number | null;
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

type CompensationTransactionType = 'SALARY_PAYMENT' | 'ADVANCE';

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
  selectedUser: AdminUser | null = null;
  userTransactions: any[] = [];
  isLoadingTransactions = false;
  isSavingTransaction = false;
  transactionAmount: number | null = null;
  transactionDescription = '';
  dailySalaryDrafts: Record<number, number | null> = {};
  selectedMonth = this.currentMonthValue();
  message = '';
  isError = false;
  editingLocationId: number | null = null;
  locationForm = this.emptyLocationForm();

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
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
      next: (response) => {
        this.summary = response || this.summary;
        this.cdr.detectChanges();
      },
      error: () => this.showMessage('Could not load the attendance summary.', true)
    });
    this.loadUsers();
    this.loadLocations();
    this.attendanceService.getAdminActivity().subscribe({
      next: (response) => {
        this.activity = response || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.activity = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadUsers(): void {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    this.attendanceService.getAdminUsers(year, month).subscribe({
      next: (response) => {
        this.users = response || [];
        this.dailySalaryDrafts = Object.fromEntries(this.users.map(account => [account.id, account.dailySalary]));
        if (this.selectedUser) {
          this.selectedUser = this.users.find(account => account.id === this.selectedUser?.id) || this.selectedUser;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
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

  openUserDetails(account: AdminUser): void {
    this.selectedUser = account;
    this.userTransactions = [];
    this.transactionAmount = null;
    this.transactionDescription = '';
    if (account.source === 'LEGACY') {
      return;
    }

    this.isLoadingTransactions = true;
    this.attendanceService.getUserTransactions(account.id).subscribe({
      next: (transactions) => {
        this.userTransactions = transactions || [];
        this.isLoadingTransactions = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoadingTransactions = false;
        this.showMessage(error?.error?.message || 'Could not load compensation history.', true);
      }
    });
  }

  closeUserDetails(): void {
    this.selectedUser = null;
    this.userTransactions = [];
    this.transactionAmount = null;
    this.transactionDescription = '';
  }

  recordTransaction(type: CompensationTransactionType): void {
    if (!this.selectedUser || this.selectedUser.source === 'LEGACY') {
      return;
    }
    const amount = Number(this.transactionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.showMessage('Enter an amount greater than zero.', true);
      return;
    }
    if (!this.transactionDescription.trim()) {
      this.showMessage('Enter a description for this transaction.', true);
      return;
    }

    this.isSavingTransaction = true;
    this.attendanceService.addUserTransaction(
      this.selectedUser.id, type, amount, this.transactionDescription.trim()
    ).subscribe({
      next: (transaction) => {
        this.userTransactions = [transaction, ...this.userTransactions];
        this.transactionAmount = null;
        this.transactionDescription = '';
        this.isSavingTransaction = false;
        this.showMessage(type === 'ADVANCE' ? 'Advance recorded.' : 'Salary payment recorded.', false);
        this.loadUsers();
        this.loadActivity();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSavingTransaction = false;
        this.showMessage(error?.error?.message || 'Could not record this transaction.', true);
      }
    });
  }

  loadActivity(): void {
    this.attendanceService.getAdminActivity().subscribe({
      next: (response) => {
        this.activity = response || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.activity = [];
        this.cdr.detectChanges();
      }
    });
  }

  saveDailySalary(account: AdminUser): void {
    const dailySalary = this.dailySalaryDrafts[account.id];
    if (dailySalary === null || dailySalary === undefined || !Number.isFinite(Number(dailySalary)) || Number(dailySalary) < 0) {
      this.showMessage('Enter a valid non-negative daily salary.', true);
      return;
    }

    this.isSavingSalaryFor = account.id;
    this.attendanceService.updateUserDailySalary(account.id, Number(dailySalary)).subscribe({
      next: (response) => {
        account.dailySalary = response.dailySalary;
        this.dailySalaryDrafts[account.id] = response.dailySalary;
        this.isSavingSalaryFor = null;
        this.showMessage(`Daily salary updated for ${account.fullName}.`, false);
        this.loadActivity();
      },
      error: (error) => {
        this.isSavingSalaryFor = null;
        this.showMessage(error?.error?.message || 'Could not update daily salary.', true);
      }
    });
  }

  loadLocations(): void {
    this.attendanceService.getLocations().subscribe({
      next: (response) => {
        this.locations = response || [];
        this.cdr.detectChanges();
      },
      error: (error) => this.showMessage(error?.error?.message || 'Could not load attendance locations.', true)
    });
  }

  approveUser(user: AdminUser): void {
    this.isApprovingUserId = user.id;
    this.attendanceService.approveUser(user.id, user.source || 'USER', this.dailySalaryDrafts[user.id]).subscribe({
      next: (approvedUser) => {
        user.active = approvedUser.active;
        user.dailySalary = approvedUser.dailySalary;
        user.monthlyAdvance = approvedUser.monthlyAdvance;
        this.dailySalaryDrafts[user.id] = approvedUser.dailySalary;
        this.isApprovingUserId = null;
        this.showMessage(this.dailySalaryDrafts[user.id] === null
          ? `${user.fullName} is approved and can now log in.`
          : `${user.fullName} is approved with the assigned daily salary.`, false);
        this.loadUsers();
        this.loadActivity();
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
        this.loadActivity();
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
    this.cdr.detectChanges();
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
