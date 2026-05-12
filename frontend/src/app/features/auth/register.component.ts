import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

const STICKERS = [
  { n: '⚽', top: '8%',  left: '6%',  delay: '0s',   dur: '14s', rot: '-8deg'  },
  { n: '1',  top: '20%', left: '90%', delay: '1.5s', dur: '16s', rot: '5deg'   },
  { n: '🏆', top: '60%', left: '4%',  delay: '3s',   dur: '13s', rot: '10deg'  },
  { n: '47', top: '78%', left: '88%', delay: '0.8s', dur: '15s', rot: '-5deg'  },
  { n: '⭐', top: '42%', left: '3%',  delay: '2s',   dur: '17s', rot: '-12deg' },
  { n: '128',top: '55%', left: '93%', delay: '4s',   dur: '12s', rot: '8deg'   },
  { n: '🌍', top: '85%', left: '14%', delay: '1s',   dur: '18s', rot: '3deg'   },
  { n: '73', top: '10%', left: '72%', delay: '3.5s', dur: '14s', rot: '-7deg'  },
];

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule,
    RecaptchaModule, RecaptchaFormsModule,
  ],
  template: `
    <!-- Fondo animado (mismo que login) -->
    <div class="bg">
      <div class="bg-gradient"></div>
      <div class="field-lines">
        <div class="line l1"></div>
        <div class="line l2"></div>
        <div class="circle-field cf1"></div>
        <div class="circle-field cf2"></div>
      </div>
      @for (s of stickers; track s.n) {
        <div class="sticker"
             [style.top]="s.top"
             [style.left]="s.left"
             [style.animation-delay]="s.delay"
             [style.animation-duration]="s.dur"
             [style.transform]="'rotate(' + s.rot + ')'">
          {{ s.n }}
        </div>
      }
    </div>

    <!-- Panel -->
    <div class="register-wrapper">
      <div class="register-panel">

        @if (success()) {
          <!-- Estado éxito -->
          <div class="success-state">
            <div class="success-icon">📧</div>
            <h2>¡Registro exitoso!</h2>
            <p>Enviamos un enlace de verificación a</p>
            <p class="email-highlight">{{ registeredEmail() }}</p>
            <p class="hint">Revisa tu bandeja de entrada y carpeta de spam. El enlace expira en 24 horas.</p>
            <button mat-stroked-button class="resend-btn" (click)="resendEmail()">
              Reenviar correo
            </button>
            <div class="panel-footer">
              <a routerLink="/login">Ir al inicio de sesión</a>
            </div>
          </div>

        } @else {
          <!-- Header -->
          <div class="panel-header">
            <div class="logo">⚽</div>
            <h1>Crea tu cuenta</h1>
            <p>Panini MVP · Mundial 2026</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="register-form">

            <!-- Fila: nombre + usuario -->
            <div class="row-2">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre completo *</mat-label>
                <input matInput formControlName="full_name" autocomplete="name">
                @if (f('full_name')?.hasError('required') && f('full_name')?.touched) {
                  <mat-error>Requerido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Usuario *</mat-label>
                <input matInput formControlName="username" autocomplete="username">
                @if (f('username')?.hasError('minlength') && f('username')?.touched) {
                  <mat-error>Mínimo 3 caracteres</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Teléfono -->
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Teléfono (opcional)</mat-label>
              <input matInput formControlName="phone" autocomplete="tel">
            </mat-form-field>

            <!-- Email + confirmación -->
            <div class="row-2">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Correo electrónico *</mat-label>
                <input matInput type="email" formControlName="email" autocomplete="email">
                @if (f('email')?.hasError('email') && f('email')?.touched) {
                  <mat-error>Correo inválido</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmar correo *</mat-label>
                <input matInput type="email" formControlName="confirm_email" autocomplete="email">
                @if (f('confirm_email')?.hasError('mismatch') && f('confirm_email')?.touched) {
                  <mat-error>No coincide</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- Contraseña + confirmación -->
            <div class="row-2">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Contraseña *</mat-label>
                <input matInput type="password" formControlName="password" autocomplete="new-password">
                @if (f('password')?.hasError('minlength') && f('password')?.touched) {
                  <mat-error>Mínimo 6 caracteres</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmar contraseña *</mat-label>
                <input matInput type="password" formControlName="confirm_password" autocomplete="new-password">
                @if (f('confirm_password')?.hasError('mismatch') && f('confirm_password')?.touched) {
                  <mat-error>No coincide</mat-error>
                }
              </mat-form-field>
            </div>

            <!-- reCAPTCHA -->
            <div class="recaptcha-wrapper">
              <re-captcha formControlName="recaptcha_token" [siteKey]="siteKey"></re-captcha>
              @if (f('recaptcha_token')?.hasError('required') && f('recaptcha_token')?.touched) {
                <span class="recaptcha-error">Confirma que no eres un robot</span>
              }
            </div>

            @if (error()) {
              <p class="error-msg">{{ error() }}</p>
            }

            <button class="submit-btn" type="submit"
                    [disabled]="form.invalid || loading()">
              @if (loading()) {
                <mat-spinner diameter="20" class="spinner-white"></mat-spinner>
              } @else {
                Crear cuenta
              }
            </button>
          </form>

          <div class="panel-footer">
            <a routerLink="/login">¿Ya tienes cuenta? Inicia sesión</a>
            <span class="divider">·</span>
            <a routerLink="/">Volver al inicio</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; min-height: 100vh; overflow-x: hidden; }

    /* ── FONDO (idéntico al login) ── */
    .bg {
      position: fixed; inset: 0; z-index: 0;
      background: linear-gradient(135deg, #050b1a 0%, #0d1b3e 45%, #0a1a2e 100%);
    }
    .bg-gradient {
      position: absolute; inset: 0;
      background:
        radial-gradient(ellipse 60% 50% at 20% 20%, rgba(25,118,210,.25) 0%, transparent 70%),
        radial-gradient(ellipse 50% 40% at 80% 80%, rgba(13,71,161,.3) 0%, transparent 70%);
      animation: gradMove 10s ease-in-out infinite alternate;
    }
    @keyframes gradMove {
      from { opacity: .8; }
      to   { opacity: 1; transform: scale(1.05); }
    }
    .field-lines { position: absolute; inset: 0; }
    .line { position: absolute; background: rgba(255,255,255,.04); border-radius: 2px; }
    .l1 { width: 1px; height: 100%; left: 50%; top: 0; }
    .l2 { width: 100%; height: 1px; left: 0; top: 50%; }
    .circle-field {
      position: absolute; border-radius: 50%;
      border: 1px solid rgba(255,255,255,.05);
    }
    .cf1 { width: 220px; height: 220px; top: 50%; left: 50%; transform: translate(-50%,-50%); }
    .cf2 { width: 420px; height: 420px; top: 50%; left: 50%; transform: translate(-50%,-50%); }
    .sticker {
      position: absolute; z-index: 1;
      width: 52px; height: 68px;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 800;
      color: rgba(255,255,255,.3);
      animation: floatSticker linear infinite;
      backdrop-filter: blur(2px);
    }
    @keyframes floatSticker {
      0%   { transform: translateY(0px);   opacity: .25; }
      25%  { transform: translateY(-30px); opacity: .45; }
      50%  { transform: translateY(-60px); opacity: .35; }
      75%  { transform: translateY(-30px); opacity: .45; }
      100% { transform: translateY(0px);   opacity: .25; }
    }

    /* ── PANEL ── */
    .register-wrapper {
      position: relative; z-index: 10;
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 32px 16px;
    }
    .register-panel {
      width: 100%; max-width: 620px;
      background: rgba(255,255,255,.06);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 24px;
      padding: 36px 40px 28px;
      box-shadow: 0 24px 64px rgba(0,0,0,.5);
      animation: panelIn .5s cubic-bezier(.22,.61,.36,1) both;
    }
    @keyframes panelIn {
      from { opacity: 0; transform: translateY(24px) scale(.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .panel-header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 40px; line-height: 1; margin-bottom: 8px; }
    .panel-header h1 {
      font-size: 24px; font-weight: 800; color: #fff;
      margin: 0 0 4px; letter-spacing: -.5px;
    }
    .panel-header p { font-size: 13px; color: rgba(255,255,255,.45); margin: 0; }

    .register-form { display: flex; flex-direction: column; gap: 2px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full-width { width: 100%; }

    /* Campos oscuros */
    ::ng-deep .register-panel .mat-mdc-text-field-wrapper {
      background: rgba(255,255,255,.07) !important;
    }
    ::ng-deep .register-panel .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .register-panel .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .register-panel .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: rgba(255,255,255,.2) !important;
    }
    ::ng-deep .register-panel .mdc-text-field--focused .mdc-notched-outline__leading,
    ::ng-deep .register-panel .mdc-text-field--focused .mdc-notched-outline__notch,
    ::ng-deep .register-panel .mdc-text-field--focused .mdc-notched-outline__trailing {
      border-color: #42a5f5 !important;
    }
    ::ng-deep .register-panel .mat-mdc-input-element { color: #fff !important; }
    ::ng-deep .register-panel .mat-mdc-floating-label { color: rgba(255,255,255,.55) !important; }
    ::ng-deep .register-panel .mat-mdc-form-field-subscript-wrapper { margin-bottom: 2px; }

    .recaptcha-wrapper { margin: 8px 0 4px; }
    .recaptcha-error { font-size: 12px; color: #ef9a9a; display: block; margin-top: 4px; }

    .error-msg {
      color: #ef9a9a; font-size: 13px;
      background: rgba(239,83,80,.15);
      border: 1px solid rgba(239,83,80,.3);
      border-radius: 8px; padding: 8px 12px; margin: 4px 0 0;
    }

    .submit-btn {
      width: 100%; height: 48px;
      font-size: 15px; font-weight: 700;
      background: linear-gradient(135deg, #1565c0 0%, #1e88e5 100%);
      color: #fff; border: none; border-radius: 12px;
      box-shadow: 0 4px 16px rgba(21,101,192,.4);
      margin-top: 10px; cursor: pointer;
      transition: box-shadow .2s, transform .1s;
      display: flex; align-items: center; justify-content: center;
    }
    .submit-btn:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(21,101,192,.6);
      transform: translateY(-1px);
    }
    .submit-btn:disabled { opacity: .5; cursor: not-allowed; }
    ::ng-deep .spinner-white circle { stroke: #fff !important; }

    .panel-footer {
      display: flex; justify-content: center; align-items: center;
      gap: 8px; margin-top: 20px; font-size: 13px;
    }
    .panel-footer a { color: rgba(255,255,255,.6); text-decoration: none; }
    .panel-footer a:hover { color: #fff; }
    .divider { color: rgba(255,255,255,.3); }

    /* Estado éxito */
    .success-state { text-align: center; padding: 16px 0; }
    .success-icon { font-size: 56px; margin-bottom: 16px; }
    .success-state h2 { color: #fff; font-size: 22px; margin: 0 0 8px; }
    .success-state p { color: rgba(255,255,255,.6); margin: 0 0 6px; font-size: 14px; }
    .email-highlight {
      color: #42a5f5 !important; font-weight: 700 !important;
      font-size: 16px !important; margin: 4px 0 12px !important;
    }
    .hint { font-size: 12px !important; color: rgba(255,255,255,.4) !important; margin-bottom: 20px !important; }
    .resend-btn { color: rgba(255,255,255,.7) !important; border-color: rgba(255,255,255,.25) !important; }

    @media (max-width: 520px) {
      .register-panel { padding: 28px 20px 20px; }
      .row-2 { grid-template-columns: 1fr; gap: 0; }
    }
  `],
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  stickers = STICKERS;
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

  f(name: string) { return this.form.get(name); }

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
