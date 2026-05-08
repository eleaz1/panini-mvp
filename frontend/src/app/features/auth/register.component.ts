import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecaptchaModule, RecaptchaFormsModule } from 'ng-recaptcha';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

const matchField = (otherField: string): ValidatorFn => (ctrl: AbstractControl) => {
  const other = ctrl.parent?.get(otherField);
  return other && ctrl.value !== other.value ? { mismatch: true } : null;
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule,
    RecaptchaModule, RecaptchaFormsModule,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <mat-card-title>Panini MVP 2026</mat-card-title>
          <mat-card-subtitle>Crea tu cuenta</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (success()) {
            <div class="success-box">
              <p>✅ ¡Registro exitoso!</p>
              <p>Revisa tu correo <strong>{{ registeredEmail() }}</strong> y haz clic en el enlace de verificación para activar tu cuenta.</p>
              <button mat-stroked-button (click)="resendEmail()">Reenviar correo</button>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre completo *</mat-label>
                <input matInput formControlName="full_name" autocomplete="name">
                @if (form.get('full_name')?.hasError('required') && form.get('full_name')?.touched) {
                  <mat-error>Campo requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Usuario *</mat-label>
                <input matInput formControlName="username" autocomplete="username">
                @if (form.get('username')?.hasError('minlength') && form.get('username')?.touched) {
                  <mat-error>Mínimo 3 caracteres</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Teléfono</mat-label>
                <input matInput formControlName="phone" autocomplete="tel" placeholder="Opcional">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Correo electrónico *</mat-label>
                <input matInput type="email" formControlName="email" autocomplete="email">
                @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                  <mat-error>Correo inválido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmar correo *</mat-label>
                <input matInput type="email" formControlName="confirm_email" autocomplete="email">
                @if (form.get('confirm_email')?.hasError('mismatch') && form.get('confirm_email')?.touched) {
                  <mat-error>Los correos no coinciden</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Contraseña *</mat-label>
                <input matInput type="password" formControlName="password" autocomplete="new-password">
                @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
                  <mat-error>Mínimo 6 caracteres</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmar contraseña *</mat-label>
                <input matInput type="password" formControlName="confirm_password" autocomplete="new-password">
                @if (form.get('confirm_password')?.hasError('mismatch') && form.get('confirm_password')?.touched) {
                  <mat-error>Las contraseñas no coinciden</mat-error>
                }
              </mat-form-field>

              <div class="recaptcha-wrapper">
                <re-captcha formControlName="recaptcha_token" [siteKey]="siteKey"></re-captcha>
                @if (form.get('recaptcha_token')?.hasError('required') && form.get('recaptcha_token')?.touched) {
                  <mat-error class="recaptcha-error">Por favor confirma que no eres un robot</mat-error>
                }
              </div>

              @if (error()) {
                <p class="error-msg">{{ error() }}</p>
              }
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="form.invalid || loading()" class="full-width submit-btn">
                @if (loading()) { <mat-spinner diameter="20"></mat-spinner> }
                @else { Registrarse }
              </button>
            </form>
          }
        </mat-card-content>
        <mat-card-actions>
          <a mat-button routerLink="/login">¿Ya tienes cuenta? Inicia sesión</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 24px 16px; }
    .auth-card { width: 100%; max-width: 480px; }
    .full-width { width: 100%; display: block; margin-bottom: 8px; }
    .error-msg { color: var(--mat-sys-error, #b00020); font-size: 14px; margin-bottom: 8px; }
    .recaptcha-wrapper { margin: 8px 0 16px; }
    .recaptcha-error { font-size: 12px; color: var(--mat-sys-error, #b00020); margin-top: 4px; display: block; }
    .submit-btn { margin-top: 8px; }
    mat-spinner { display: inline-block; }
    .success-box { background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 16px; text-align: center; }
    .success-box p { margin: 0 0 8px; }
    .success-box button { margin-top: 8px; }
  `],
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  siteKey = environment.recaptchaSiteKey;
  loading = signal(false);
  error = signal('');
  success = signal(false);
  registeredEmail = signal('');

  form = this.fb.nonNullable.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    phone: [''],
    email: ['', [Validators.required, Validators.email]],
    confirm_email: ['', [Validators.required, matchField('email')]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm_password: ['', [Validators.required, matchField('password')]],
    recaptcha_token: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    this.auth.register(v).subscribe({
      next: () => {
        this.registeredEmail.set(v.email);
        this.success.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.detail ?? 'Error al registrar');
        this.loading.set(false);
      },
    });
  }

  resendEmail(): void {
    const email = this.registeredEmail();
    if (!email) return;
    this.auth.resendVerification(email).subscribe();
  }
}
