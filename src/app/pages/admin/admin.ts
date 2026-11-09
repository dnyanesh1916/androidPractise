import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';

interface AdminUser {
  id: number;
  username: string;
  fullName: string;
  role: string;
  profileImage?: string | null;
  locationName?: string | null;
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

interface AdminAttendanceEntry {
  attendanceId: number;
  status: string;
  checkInTime: string;
  checkOutTime: string | null;
  locationName: string | null;
}

interface AdminAttendanceCalendarDay {
  key: string;
  date: number | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: AdminAttendanceEntry[];
}

type AdminSection = 'users' | 'locations';
type UserDetailTab = 'compensation' | 'attendance';

type CompensationTransactionType = 'SALARY_PAYMENT' | 'ADVANCE';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit, OnDestroy {
  summary: any = { totalUsers: 0, totalPresent: 0, totalLate: 0, totalAbsent: 0 };
  users: AdminUser[] = [];
  locations: AttendanceLocation[] = [];
  activity: any[] = [];
  user: any = null;
  showAdminDetails = false;
  isExportingData = false;
  readonly copyrightYear = new Date().getFullYear();
  activeSection: AdminSection = 'users';
  isLoading = false;
  isSavingLocation = false;
  isSavingSalaryFor: number | null = null;
  isApprovingUserId: number | null = null;
  hoveredUserId: number | null = null;
  selectedUser: AdminUser | null = null;
  activeDetailTab: UserDetailTab = 'compensation';
  userTransactions: any[] = [];
  userAttendance: AdminAttendanceEntry[] = [];
  attendanceCalendarDate = new Date();
  attendanceCalendarDays: AdminAttendanceCalendarDay[] = [];
  readonly attendanceWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  isLoadingTransactions = false;
  isLoadingAttendance = false;
  attendanceMessage = '';
  isSavingTransaction = false;
  transactionMessage = '';
  isTransactionError = false;
  transactionAmount: number | null = null;
  transactionDescription = '';
  dailySalaryDrafts: Record<number, number | null> = {};
  selectedMonth = this.currentMonthValue();
  selectedLocationName: string | null = null;
  message = '';
  isError = false;
  approvalSalaryErrorFor: number | null = null;
  editingLocationId: number | null = null;
  locationForm = this.emptyLocationForm();
  private userRefreshTimer: number | null = null;
  private userLoadGeneration = 0;

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
    if (typeof window !== 'undefined') {
      this.userRefreshTimer = window.setInterval(() => {
        if (!document.hidden) {
          this.refreshAdminData();
        }
      }, 15000);
    }
  }

  ngOnDestroy(): void {
    if (this.userRefreshTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.userRefreshTimer);
    }
  }

  @HostListener('window:focus')
  refreshUsersOnFocus(): void {
    if (this.user && !document.hidden) {
      this.refreshAdminData();
    }
  }

  get pendingUsers(): number {
    return this.users.filter(user => user.role === 'USER' && !user.active).length;
  }

  get activeLocations(): AttendanceLocation[] {
    return this.locations.filter(location => location.active);
  }

  get monthlyTotals(): {
    dailySalary: number;
    workingDays: number;
    earned: number;
    paid: number;
    advance: number;
    balance: number;
  } {
    return this.users.reduce((totals, account) => ({
      dailySalary: totals.dailySalary + (account.dailySalary || 0),
      workingDays: totals.workingDays + (account.workingDaysThisMonth || 0),
      earned: totals.earned + (account.earnedPayThisMonth || 0),
      paid: totals.paid + (account.salaryPaidThisMonth || 0),
      advance: totals.advance + (account.monthlyAdvance || 0),
      balance: totals.balance + (account.totalBalanceThisMonth || 0)
    }), { dailySalary: 0, workingDays: 0, earned: 0, paid: 0, advance: 0, balance: 0 });
  }

  showSection(section: AdminSection): void {
    this.activeSection = section;
    this.message = '';
  }

  loadData(): void {
    this.isLoading = true;
    this.loadAdminSummary();
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

  private refreshAdminData(): void {
    this.loadAdminSummary();
    this.loadUsers();
    if (this.selectedUser && this.selectedUser.source !== 'LEGACY') {
      this.loadUserAttendance(this.selectedUser.id);
    }
  }

  private loadAdminSummary(): void {
    this.attendanceService.getAdminSummary().subscribe({
      next: (response) => {
        this.summary = response || this.summary;
        this.cdr.detectChanges();
      },
      error: () => this.showMessage('Could not load the attendance summary.', true)
    });
  }

  loadUsers(): void {
    const requestGeneration = ++this.userLoadGeneration;
    const [year, month] = this.selectedMonth.split('-').map(Number);
    this.attendanceService.getAdminUsers(year, month, this.selectedLocationName).subscribe({
      next: (response) => {
        if (requestGeneration !== this.userLoadGeneration) {
          return;
        }
        this.users = response || [];
        this.dailySalaryDrafts = Object.fromEntries(this.users.map(account => [account.id, account.dailySalary]));
        if (this.selectedUser) {
          this.selectedUser = this.users.find(account => account.id === this.selectedUser?.id) || this.selectedUser;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        if (requestGeneration !== this.userLoadGeneration) {
          return;
        }
        this.isLoading = false;
        this.showMessage(error?.error?.message || 'Could not load registered users.', true);
      }
    });
  }

  onMonthChanged(): void {
    this.loadUsers();
  }

  onLocationChanged(): void {
    this.loadUsers();
  }

  clearApprovalSalaryError(userId: number): void {
    if (this.approvalSalaryErrorFor === userId) {
      this.approvalSalaryErrorFor = null;
    }
  }

  openUserDetails(account: AdminUser): void {
    this.selectedUser = account;
    this.activeDetailTab = 'compensation';
    this.userTransactions = [];
    this.userAttendance = [];
    this.attendanceCalendarDate = new Date();
    this.buildAttendanceCalendar();
    this.transactionAmount = null;
    this.transactionDescription = '';
    this.transactionMessage = '';
    this.attendanceMessage = '';
    if (account.source === 'LEGACY') {
      return;
    }

    this.loadAdminSummary();
    this.loadUsers();
    this.isLoadingTransactions = true;
    this.loadUserAttendance(account.id);
    this.attendanceService.getUserTransactions(account.id).subscribe({
      next: (transactions) => {
        this.userTransactions = transactions || [];
        this.isLoadingTransactions = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoadingTransactions = false;
        this.showTransactionMessage(this.getRequestErrorMessage(error, 'Could not load compensation history.'), true);
      }
    });
  }

  closeUserDetails(): void {
    this.selectedUser = null;
    this.userTransactions = [];
    this.userAttendance = [];
    this.attendanceCalendarDays = [];
    this.transactionAmount = null;
    this.transactionDescription = '';
    this.transactionMessage = '';
    this.attendanceMessage = '';
  }

  selectDetailTab(tab: UserDetailTab): void {
    this.activeDetailTab = tab;
    if (tab === 'attendance' && this.selectedUser && this.selectedUser.source !== 'LEGACY') {
      this.loadUserAttendance(this.selectedUser.id);
    }
  }

  changeAttendanceMonth(offset: number): void {
    this.attendanceCalendarDate = new Date(
      this.attendanceCalendarDate.getFullYear(),
      this.attendanceCalendarDate.getMonth() + offset,
      1
    );
    this.buildAttendanceCalendar();
  }

  private buildAttendanceCalendar(): void {
    const year = this.attendanceCalendarDate.getFullYear();
    const month = this.attendanceCalendarDate.getMonth();
    const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
    const todayKey = this.attendanceDateKey(new Date());
    const entriesByDate = new Map<string, AdminAttendanceEntry[]>();

    for (const entry of this.userAttendance) {
      const key = this.attendanceDateKey(entry.checkInTime);
      if (key) {
        const entries = entriesByDate.get(key) || [];
        entries.push(entry);
        entriesByDate.set(key, entries);
      }
    }

    this.attendanceCalendarDays = Array.from({ length: cellCount }, (_, index) => {
      const day = new Date(year, month, index - firstDayOffset + 1);
      const key = this.attendanceDateKey(day);
      const isCurrentMonth = day.getMonth() === month;
      return {
        key,
        date: isCurrentMonth ? day.getDate() : null,
        isCurrentMonth,
        isToday: isCurrentMonth && key === todayKey,
        entries: isCurrentMonth ? entriesByDate.get(key) || [] : []
      };
    });
  }

  private attendanceDateKey(value: string | Date): string {
    if (value instanceof Date) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    return value.slice(0, 10);
  }

  private loadUserAttendance(userId: number): void {
    this.isLoadingAttendance = true;
    this.attendanceMessage = '';
    this.attendanceService.getAdminUserAttendance(userId).subscribe({
      next: (entries) => {
        if (this.selectedUser?.id === userId) {
          this.userAttendance = entries || [];
          this.buildAttendanceCalendar();
        }
        this.isLoadingAttendance = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoadingAttendance = false;
        if (this.selectedUser?.id === userId) {
          this.attendanceMessage = this.getRequestErrorMessage(error, "Could not load this user's attendance.");
        }
        this.cdr.detectChanges();
      }
    });
  }

  getTransactionRestriction(account: AdminUser): string {
    if (account.dailySalary === null || account.dailySalary === undefined) {
      return 'Set a daily salary before recording a salary payment or advance.';
    }
    if (this.selectedMonth === this.currentMonthValue() && account.workingDaysThisMonth === 0) {
      return 'Mark attendance at least once this month before recording a salary payment or advance.';
    }
    return '';
  }

  recordTransaction(type: CompensationTransactionType): void {
    if (!this.selectedUser || this.selectedUser.source === 'LEGACY') {
      return;
    }
    this.transactionMessage = '';
    const restriction = this.getTransactionRestriction(this.selectedUser);
    if (restriction) {
      this.showTransactionMessage(restriction, true);
      return;
    }
    const amount = Number(this.transactionAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.showTransactionMessage('Enter an amount greater than zero.', true);
      return;
    }
    if (!this.transactionDescription.trim()) {
      this.showTransactionMessage('Enter a description for this transaction.', true);
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
        this.showTransactionMessage(type === 'ADVANCE' ? 'Advance recorded.' : 'Salary payment recorded.', false);
        this.loadUsers();
        this.loadActivity();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSavingTransaction = false;
        this.showTransactionMessage(this.getRequestErrorMessage(error, 'Could not record this transaction.'), true);
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
    if (dailySalary === null || dailySalary === undefined || !Number.isFinite(Number(dailySalary)) || Number(dailySalary) <= 0) {
      this.showMessage('Enter a daily salary greater than zero.', true);
      return;
    }
    if (Number(dailySalary) === Number(account.dailySalary)) {
      return;
    }

    this.isSavingSalaryFor = account.id;
    this.attendanceService.updateUserDailySalary(account.id, Number(dailySalary)).subscribe({
      next: (response) => {
        account.dailySalary = response.dailySalary;
        this.dailySalaryDrafts[account.id] = response.dailySalary;
        this.isSavingSalaryFor = null;
        this.showMessage(`Daily salary updated for ${account.fullName}.`, false);
        this.loadUsers();
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
        if (this.selectedLocationName !== null
            && !this.activeLocations.some(location => location.name === this.selectedLocationName)) {
          this.selectedLocationName = null;
          this.loadUsers();
        }
        this.cdr.detectChanges();
      },
      error: (error) => this.showMessage(error?.error?.message || 'Could not load attendance locations.', true)
    });
  }

  approveUser(user: AdminUser): void {
    const salaryValue = this.dailySalaryDrafts[user.id];
    const dailySalary = salaryValue === null || salaryValue === undefined || String(salaryValue).trim() === ''
      ? Number.NaN
      : Number(salaryValue);
    if (!Number.isFinite(dailySalary) || dailySalary <= 0) {
      this.approvalSalaryErrorFor = user.id;
      this.showMessage('Daily salary is mandatory. Enter an amount greater than zero before approving this user.', true);
      return;
    }
    this.approvalSalaryErrorFor = null;
    this.isApprovingUserId = user.id;
    this.attendanceService.approveUser(user.id, user.source || 'USER', dailySalary).subscribe({
      next: (approvedUser) => {
        user.active = approvedUser.active;
        user.dailySalary = approvedUser.dailySalary;
        user.monthlyAdvance = approvedUser.monthlyAdvance;
        this.dailySalaryDrafts[user.id] = approvedUser.dailySalary;
        this.isApprovingUserId = null;
        this.showMessage(`${user.fullName} is approved with the assigned daily salary.`, false);
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
        this.loadUsers();
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
    this.authService.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login')
    });
  }

  closeAdminDetails(): void {
    this.showAdminDetails = false;
  }

  exportDataWorkbook(): void {
    if (this.isExportingData) {
      return;
    }

    this.isExportingData = true;
    this.attendanceService.exportAdminData().subscribe({
      next: (file) => {
        this.downloadWorkbookFile(file);
        this.isExportingData = false;
        this.showMessage('Workbook downloaded and saved in the database as the latest export.', false);
      },
      error: (error) => {
        this.isExportingData = false;
        this.showMessage(this.getRequestErrorMessage(error, 'Could not export database data.'), true);
      }
    });
  }

  downloadStoredWorkbook(): void {
    if (this.isExportingData) {
      return;
    }

    this.isExportingData = true;
    this.attendanceService.downloadLatestAdminDataExport().subscribe({
      next: (file) => {
        this.downloadWorkbookFile(file);
        this.isExportingData = false;
        this.showMessage('Saved workbook downloaded from the database.', false);
      },
      error: (error) => {
        this.isExportingData = false;
        const message = error?.status === 404
          ? 'No saved workbook exists yet. Use Export Excel to create and store one.'
          : this.getRequestErrorMessage(error, 'Could not download the saved workbook.');
        this.showMessage(message, true);
      }
    });
  }

  private downloadWorkbookFile(file: Blob): void {
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'attendease-data.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  private showMessage(message: string, isError: boolean): void {
    this.message = message;
    this.isError = isError;
    this.cdr.detectChanges();
  }

  private showTransactionMessage(message: string, isError: boolean): void {
    this.transactionMessage = message;
    this.isTransactionError = isError;
    this.cdr.detectChanges();
  }

  private getRequestErrorMessage(error: any, fallback: string): string {
    if (error?.status === 401 || error?.status === 403) {
      return 'Your admin session is no longer authorized. Sign out and sign in again to continue.';
    }
    return error?.error?.message || error?.message || fallback;
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
