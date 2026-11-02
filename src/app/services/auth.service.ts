import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const LOCAL_API_BASE_URL = 'http://localhost:8080';
const DEPLOYED_API_BASE_URL = 'https://androidpractisebackend-1.onrender.com';

const isLocalEnvironment = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = isLocalEnvironment ? LOCAL_API_BASE_URL : DEPLOYED_API_BASE_URL;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  register(payload: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}/api/auth/register`, payload);
  }

  login(payload: any): Observable<any> {
    return this.http.post(`${API_BASE_URL}/api/auth/login`, payload, { withCredentials: true });
  }

  saveUser(user: any): void {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return;
    }

    const safeUser = {
      ...user,
      profileImage: user?.profileImage || ''
    };

    localStorage.setItem('attendease-user', JSON.stringify(safeUser));
  }

  getCurrentUser(): any {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return null;
    }
    const raw = localStorage.getItem('attendease-user');
    return raw ? JSON.parse(raw) : null;
  }

  logout(): void {
    if (typeof window === 'undefined' || !('localStorage' in window)) {
      return;
    }
    localStorage.removeItem('attendease-user');
    this.http.post(`${API_BASE_URL}/api/auth/logout`, {}, { withCredentials: true }).subscribe({
      error: () => undefined
    });
  }
}
