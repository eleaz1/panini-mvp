// src/app/core/services/auth.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface TokenResponse { access_token: string; token_type: string; }
interface UserResponse { id: number; username: string; email: string; created_at: string; }

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

  register(username: string, email: string, password: string) {
    return this.http.post<UserResponse>(`${this.api}/auth/register`, { username, email, password });
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

// ── HTTP Interceptor ──────────────────────────────────────────────────────────
// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

// ── Auth Guard ────────────────────────────────────────────────────────────────
// src/app/core/guards/auth.guard.ts
import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/login']);
  return false;
};
