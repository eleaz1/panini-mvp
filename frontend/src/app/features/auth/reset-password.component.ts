import { Component, inject, signal, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

const matchField = (otherField: string): ValidatorFn => (ctrl: AbstractControl) => {
  const other = ctrl.parent?.get(otherField);
  return other && ctrl.value !== other.value ? { mismatch: true } : null;
};

@Component({
  selector: 'app-reset-password',
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
          <mat-card-title>Nueva contraseña</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (!token()) {
            <p class="error-msg">Enlace inválido o expirado. <a routerLink="/forgot-password">Solicita uno nuevo.</a></p>
          } @else if (success()) {
            <div class="success-box">
              <p>✅ ¡Contraseña actualizada!</p>
              <a mat-raised-button color="primary" routerLink="/login">Iniciar sesión</a>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nueva contraseña</mat-label>
                <input matInput type="password" formControlName="new_password" autocomplete="new-password">
                @if (form.get('new_password')?.hasError('minlength') && form.get('new_password')?.touched) {
                  <mat-error>Mínimo 6 caracteres</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmar contraseña</mat-label>
                <input matInput type="password" formControlName="confirm_password" autocomplete="new-password">
                @if (form.get('confirm_password')?.hasError('mismatch') && form.get('confirm_password')?.touched) {
                  <mat-error>Las contraseñas no coinciden</mat-error>
                }
              </mat-form-field>
              @if (error()) {
                <p class="error-msg">{{ error() }}</p>
              }
              <button mat-raised-button color="primary" type="submit"
                      [disabled]="form.invalid || loading()" class="full-width">
                @if (loading()) { <mat-spinner diameter="20"></mat-spinner> }
                @else { Guardar contraseña }
              </button>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
    .auth-card { width: 100%; max-width: 400px; }
    .full-width { width: 100%; display: block; margin-bottom: 8px; }
    .error-msg { color: var(--mat-sys-error, #b00020); font-size: 14px; margin-bottom: 8px; }
    .success-box { text-align: center; padding: 16px; }
    mat-spinner { display: inline-block; }
  `],
})
export class ResetPasswordComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  token = signal('');
  loading = signal(false);
  error = signal('');
  success = signal(false);

  form = this.fb.nonNullable.group({
    new_password: ['', [Validators.required, Validators.minLength(6)]],
    confirm_password: ['', [Validators.required, matchField('new_password')]],
  });

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const { new_password, confirm_password } = this.form.getRawValue();
    this.auth.resetPassword(this.token(), new_password, confirm_password).subscribe({
      next: () => { this.success.set(true); this.loading.set(false); },
      error: (err) => { this.error.set(err.error?.detail ?? 'Error'); this.loading.set(false); },
    });
  }
}
