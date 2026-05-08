import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-content class="centered">
          @if (loading()) {
            <mat-spinner></mat-spinner>
            <p>Verificando tu correo...</p>
          } @else if (success()) {
            <div class="result success">
              <p class="icon">✅</p>
              <h3>¡Correo verificado!</h3>
              <p>Tu cuenta está activa. Ya puedes iniciar sesión.</p>
              <a mat-raised-button color="primary" routerLink="/login">Iniciar sesión</a>
            </div>
          } @else {
            <div class="result error">
              <p class="icon">❌</p>
              <h3>Enlace inválido o expirado</h3>
              <p>{{ errorMsg() }}</p>
              <a mat-stroked-button routerLink="/login">Ir al inicio de sesión</a>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
    .auth-card { width: 100%; max-width: 400px; }
    .centered { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; text-align: center; }
    .result h3 { margin: 0; }
    .result p { margin: 0; color: #555; }
    .icon { font-size: 48px; margin: 0; }
  `],
})
export class VerifyEmailComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  success = signal(false);
  errorMsg = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.loading.set(false);
      this.errorMsg.set('No se encontró el token de verificación.');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: () => { this.success.set(true); this.loading.set(false); },
      error: (err) => {
        this.errorMsg.set(err.error?.detail ?? 'Enlace inválido o expirado.');
        this.loading.set(false);
      },
    });
  }
}
