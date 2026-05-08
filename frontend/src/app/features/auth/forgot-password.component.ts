import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>¿Olvidaste tu contraseña?</mat-card-title>
          <mat-card-subtitle>Te enviaremos un enlace para restablecerla</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (sent()) {
            <div class="info-box">
              <p>📧 Si el correo <strong>{{ sentEmail() }}</strong> está registrado, recibirás un mensaje con instrucciones.</p>
              <p style="font-size:13px;color:#666">Revisa también tu carpeta de spam.</p>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Correo electrónico</mat-label>
                <input matInput type="email" formControlName="email" autocomplete="email">
              </mat-form-field>
              @if (error()) {
                <p class="error-msg">{{ error() }}</p>
              }
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="form.invalid || loading()" class="full-width">
                @if (loading()) { <mat-spinner diameter="20"></mat-spinner> }
                @else { Enviar enlace }
              </button>
            </form>
          }
        </mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/login">Volver al inicio de sesión</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
    .auth-card { width: 100%; max-width: 400px; }
    .full-width { width: 100%; display: block; margin-bottom: 8px; }
    .error-msg { color: var(--mat-sys-error, #b00020); font-size: 14px; margin-bottom: 8px; }
    .info-box { background: #e3f2fd; border: 1px solid #90caf9; border-radius: 8px; padding: 16px; }
    .info-box p { margin: 0 0 8px; }
    mat-spinner { display: inline-block; }
  `],
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  loading = signal(false);
  error = signal('');
  sent = signal(false);
  sentEmail = signal('');

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { email } = this.form.getRawValue();
    this.auth.forgotPassword(email).subscribe({
      next: () => { this.sentEmail.set(email); this.sent.set(true); this.loading.set(false); },
      error: (err) => { this.error.set(err.error?.detail ?? 'Error'); this.loading.set(false); },
    });
  }
}
