import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  constructor(private http: HttpClient) {}

  markAttendance(payload: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}/api/attendance/mark`, payload);
  }

  getUserAttendance(userId: number): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/attendance/user/${userId}`);
  }

  getUsers(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/attendance/users`);
  }

  getAdminSummary(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/admin/summary`);
  }

  getAdminActivity(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/admin/activity`);
  }
}
