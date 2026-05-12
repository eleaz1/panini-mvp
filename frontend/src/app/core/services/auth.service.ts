import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type UserRole = 'user' | 'admin';

export interface TokenResponse { access_token: string; token_type: string; }
export interface UserResponse {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface RegisterPayload {
  username: string;
  full_name: string;
  phone: string;
  email: string;
  confirm_email: string;
  password: string;
  confirm_password: string;
  recaptcha_token: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = `${environment.apiUrl}/api/v1`;

  private _token = signal<string | null>(localStorage.getItem('panini_token'));
  private _currentUser = signal<UserResponse | null>(null);

  readonly isAuthenticated = computed(() => !!this._token());
  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAdmin = computed(() => this._currentUser()?.role === 'admin');

  constructor() {
    const token = localStorage.getItem('panini_token');
    if (token) {
      const payload = decodeJwtPayload(token);
      if (payload['role']) {
        this._currentUser.set({
          id: Number(payload['sub']),
          username: payload['username'] as string,
          full_name: '',
          email: '',
          role: payload['role'] as UserRole,
          created_at: '',
        });
      }
    }
  }

  login(username: string, password: string) {
    return this.http.post<TokenResponse>(`${this.api}/auth/login`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem('panini_token', res.access_token);
        this._token.set(res.access_token);
        const payload = decodeJwtPayload(res.access_token);
        this._currentUser.set({
          id: Number(payload['sub']),
          username: payload['username'] as string,
          full_name: '',
          email: '',
          role: (payload['role'] as UserRole) ?? 'user',
          created_at: '',
        });
      })
    );
  }

  register(payload: RegisterPayload) {
    return this.http.post<UserResponse>(`${this.api}/auth/register`, payload);
  }

  verifyEmail(token: string) {
    return this.http.post<{ detail: string }>(`${this.api}/auth/verify-email`, { token });
  }

  resendVerification(email: string) {
    return this.http.post<{ detail: string }>(`${this.api}/auth/resend-verification`, { email });
  }

  forgotPassword(email: string) {
    return this.http.post<{ detail: string }>(`${this.api}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, new_password: string, confirm_password: string) {
    return this.http.post<{ detail: string }>(`${this.api}/auth/reset-password`, { token, new_password, confirm_password });
  }

  me() {
    return this.http.get<UserResponse>(`${this.api}/auth/me`).pipe(
      tap(user => this._currentUser.set(user))
    );
  }

  logout(): void {
    localStorage.removeItem('panini_token');
    this._token.set(null);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
