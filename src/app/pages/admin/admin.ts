import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  summary: any = { totalUsers: 0, totalPresent: 0, totalLate: 0, totalAbsent: 0 };
  users: any[] = [];
  activity: any[] = [];
  user: any = null;

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

  loadData(): void {
    this.attendanceService.getAdminSummary().subscribe((res) => this.summary = res);
    this.attendanceService.getUsers().subscribe((res) => this.users = res || []);
    this.attendanceService.getAdminActivity().subscribe((res) => this.activity = res || []);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
