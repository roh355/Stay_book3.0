import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { User } from './models';

const TOKEN_KEY = 'staybook.token';

interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  readonly user = signal<User | null>(null);
  readonly isSignedIn = computed(() => this.user() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /** Restore + validate a persisted session on boot. */
  async init(): Promise<void> {
    if (!this.token) return;
    try {
      const res = await firstValueFrom(
        this.http.get<{ user: User }>('/api/auth/me'),
      );
      this.user.set(res.user);
    } catch {
      this.logout();
    }
  }

  async login(username: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>('/api/auth/login', { username, password }),
    );
    this.apply(res);
  }

  async register(username: string, password: string, name?: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>('/api/auth/register', { username, password, name }),
    );
    this.apply(res);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.user.set(null);
  }

  private apply(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    this.user.set(res.user);
  }
}
