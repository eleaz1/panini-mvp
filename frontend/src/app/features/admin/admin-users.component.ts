import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTableModule,
  ],
  template: `
    <div class="admin-users-container">
      <header class="admin-header">
        <div class="header-left">
          <button mat-icon-button (click)="router.navigate(['/albums'])" matTooltip="Volver a mis álbumes">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>Administración de Usuarios</h1>
        </div>
        <div class="header-right">
          <button mat-stroked-button (click)="router.navigate(['/admin/templates'])" matTooltip="Gestión de templates">
            <mat-icon>layers</mat-icon> Templates
          </button>
          <button mat-icon-button (click)="auth.logout()" matTooltip="Cerrar sesión">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="loading-center">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {
        <mat-card class="users-card">
          <mat-card-header>
            <mat-card-title>Usuarios registrados ({{ users().length }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="users()" class="users-table">

              <ng-container matColumnDef="username">
                <th mat-header-cell *matHeaderCellDef>Usuario</th>
                <td mat-cell *matCellDef="let u">
                  <strong>{{ u.username }}</strong>
                  @if (u.role === 'admin') {
                    <mat-chip class="admin-chip">admin</mat-chip>
                  }
                </td>
              </ng-container>

              <ng-container matColumnDef="full_name">
                <th mat-header-cell *matHeaderCellDef>Nombre</th>
                <td mat-cell *matCellDef="let u">{{ u.full_name || '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Correo</th>
                <td mat-cell *matCellDef="let u">{{ u.email }}</td>
              </ng-container>

              <ng-container matColumnDef="phone">
                <th mat-header-cell *matHeaderCellDef>Teléfono</th>
                <td mat-cell *matCellDef="let u">{{ u.phone || '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let u">
                  <mat-chip [class]="u.is_active ? 'chip-active' : 'chip-inactive'">
                    {{ u.is_active ? 'Activo' : 'Inactivo' }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="created_at">
                <th mat-header-cell *matHeaderCellDef>Registrado</th>
                <td mat-cell *matCellDef="let u">{{ u.created_at | date:'dd/MM/yyyy' }}</td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let u">
                  <button
                    mat-icon-button
                    [matTooltip]="u.is_active ? 'Desactivar usuario' : 'Activar usuario'"
                    [color]="u.is_active ? 'warn' : 'primary'"
                    (click)="toggleActive(u)"
                    [disabled]="busy() === u.id">
                    <mat-icon>{{ u.is_active ? 'block' : 'check_circle' }}</mat-icon>
                  </button>
                  @if (!u.is_active) {
                    <button
                      mat-icon-button
                      color="accent"
                      matTooltip="Verificar correo manualmente"
                      (click)="verifyEmail(u)"
                      [disabled]="busy() === u.id">
                      <mat-icon>mark_email_read</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns;"></tr>
            </table>

            @if (error()) {
              <p class="error-msg">{{ error() }}</p>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .admin-users-container { max-width: 1100px; margin: 0 auto; padding: 24px 16px; }
    .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header-left { display: flex; align-items: center; gap: 8px; }
    h1 { margin: 0; font-size: 1.5rem; }
    .loading-center { display: flex; justify-content: center; padding: 48px; }
    .users-card { width: 100%; }
    .users-table { width: 100%; }
    .admin-chip { font-size: 10px; height: 18px; margin-left: 6px; background: #3f51b5; color: white; }
    .chip-active { background: #e8f5e9; color: #2e7d32; }
    .chip-inactive { background: #fce4ec; color: #c62828; }
    .error-msg { color: #c62828; margin-top: 12px; }
  `],
})
export class AdminUsersComponent implements OnInit {
  router = inject(Router);
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/v1`;

  users = signal<AdminUser[]>([]);
  loading = signal(true);
  busy = signal<number | null>(null);
  error = signal<string | null>(null);

  columns = ['username', 'full_name', 'email', 'phone', 'status', 'created_at', 'actions'];

  ngOnInit() {
    this.http.get<AdminUser[]>(`${this.api}/admin/users`).subscribe({
      next: (users) => { this.users.set(users); this.loading.set(false); },
      error: () => { this.error.set('No se pudo cargar la lista de usuarios'); this.loading.set(false); },
    });
  }

  toggleActive(user: AdminUser) {
    this.busy.set(user.id);
    this.error.set(null);
    this.http.patch<AdminUser>(`${this.api}/admin/users/${user.id}/toggle-active`, {}).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.busy.set(null);
      },
      error: () => { this.error.set('Error al cambiar estado del usuario'); this.busy.set(null); },
    });
  }

  verifyEmail(user: AdminUser) {
    this.busy.set(user.id);
    this.error.set(null);
    this.http.post<AdminUser>(`${this.api}/admin/users/${user.id}/verify-email`, {}).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.busy.set(null);
      },
      error: (err) => {
        this.error.set(err.error?.detail ?? 'Error al verificar el correo');
        this.busy.set(null);
      },
    });
  }
}
