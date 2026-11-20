import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { Dashboard } from './pages/dashboard/dashboard';
import { AttendancePage } from './pages/attendance/attendance';
import { Admin } from './pages/admin/admin';

export const routes: Routes = [
  {
    path: '',
    component: Home
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'forgot-password',
    component: ForgotPassword
  },
  {
    path: 'dashboard',
    component: Dashboard
  },
  {
    path: 'attendance',
    component: AttendancePage
  },
  {
    path: 'admin',
    component: Admin
  }
];