import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './auth.service';

export interface UserCompensationTransaction {
  id: number;
  type: 'SALARY_PAYMENT' | 'ADVANCE';
  amount: number;
  description: string | null;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private readonly sessionOptions = { withCredentials: true };

  constructor(private http: HttpClient) {}

  markAttendance(payload: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}/api/attendance/mark`, payload, this.sessionOptions);
  }

  getUserAttendance(userId: number): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/attendance/user/${userId}`, this.sessionOptions);
  }

  getUserCompensation(userId: number, year: number, month: number): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/attendance/user/${userId}/compensation`, {
      ...this.sessionOptions,
      params: { year, month }
    });
  }

  getUserTransactionHistory(userId: number): Observable<UserCompensationTransaction[]> {
    return this.http.get(`${API_BASE_URL}/api/attendance/user/${userId}/transactions`, this.sessionOptions);
  }

  getUsers(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/attendance/users`, this.sessionOptions);
  }

  getAdminSummary(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/admin/summary`, this.sessionOptions);
  }

  getAdminActivity(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/admin/activity`, this.sessionOptions);
  }

  getAdminUsers(year: number, month: number): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/admin/users`, {
      ...this.sessionOptions,
      params: { year, month }
    });
  }

  updateUserDailySalary(userId: number, dailySalary: number): Observable<any> {
    return this.http.patch(`${API_BASE_URL}/api/admin/users/${userId}/salary`, { dailySalary }, this.sessionOptions);
  }

  getUserTransactions(userId: number): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/admin/users/${userId}/transactions`, this.sessionOptions);
  }

  getAdminUserAttendance(userId: number): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/admin/users/${userId}/attendance`, this.sessionOptions);
  }

  addUserTransaction(userId: number, type: 'SALARY_PAYMENT' | 'ADVANCE', amount: number, description: string): Observable<any> {
    return this.http.post(`${API_BASE_URL}/api/admin/users/${userId}/transactions`, { type, amount, description }, this.sessionOptions);
  }

  approveUser(userId: number, source: string, dailySalary: number | null): Observable<any> {
    const body = dailySalary === null ? {} : { dailySalary };
    return this.http.patch(`${API_BASE_URL}/api/admin/users/${userId}/approve`, body, {
      ...this.sessionOptions,
      params: { source }
    });
  }

  getLocations(): Observable<any> {
    return this.http.get(`${API_BASE_URL}/api/admin/locations`, this.sessionOptions);
  }

  createLocation(payload: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}/api/admin/locations`, payload, this.sessionOptions);
  }

  updateLocation(locationId: number, payload: any): Observable<any> {
    return this.http.put(`${API_BASE_URL}/api/admin/locations/${locationId}`, payload, this.sessionOptions);
  }

  deactivateLocation(locationId: number): Observable<any> {
    return this.http.delete(`${API_BASE_URL}/api/admin/locations/${locationId}`, this.sessionOptions);
  }
}
