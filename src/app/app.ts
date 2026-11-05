import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('attendease-ui');
  isAdminRoute = false;
  isLoggedIn = false;

  constructor(router: Router, authService: AuthService) {
    this.updateNavigation(router.url, authService);
    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateNavigation(event.urlAfterRedirects, authService);
      }
    });
  }

  private updateNavigation(url: string, authService: AuthService): void {
    this.isAdminRoute = url.startsWith('/admin');
    const user = authService.getCurrentUser();
    this.isLoggedIn = Boolean(user && user.role !== 'ADMIN');
  }
}
