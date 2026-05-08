import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TokenResponse { access_token: string; token_type: string; }
export interface UserResponse { id: number; username: string; full_name: string; email: string; created_at: string; }

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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = `${environment.apiUrl}/api/v1`;

  private _token = signal<string | null>(localStorage.getItem('panini_token'));
  readonly isAuthenticated = computed(() => !!this._token());
  readonly token = this._token.asReadonly();

  login(username: string, password: string) {
    return this.http.post<TokenResponse>(`${this.api}/auth/login`, { username, password }).pipe(
      tap(res => {
        localStorage.setItem('panini_token', res.access_token);
        this._token.set(res.access_token);
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
    return this.http.get<UserResponse>(`${this.api}/auth/me`);
  }

  logout(): void {
    localStorage.removeItem('panini_token');
    this._token.set(null);
    this.router.navigate(['/login']);
  }
}
