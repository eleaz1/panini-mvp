import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

const STICKERS = [
  { n: '1',   top: '12%', left: '7%',  delay: '0s',   dur: '14s', rot: '-8deg'  },
  { n: '⚽',  top: '22%', left: '88%', delay: '1.5s', dur: '16s', rot: '5deg'   },
  { n: '47',  top: '65%', left: '5%',  delay: '3s',   dur: '13s', rot: '10deg'  },
  { n: '🏆',  top: '75%', left: '85%', delay: '0.8s', dur: '15s', rot: '-5deg'  },
  { n: '128', top: '40%', left: '3%',  delay: '2s',   dur: '17s', rot: '-12deg' },
  { n: '⭐',  top: '55%', left: '92%', delay: '4s',   dur: '12s', rot: '8deg'   },
  { n: '256', top: '82%', left: '15%', delay: '1s',   dur: '18s', rot: '3deg'   },
  { n: '🎯',  top: '8%',  left: '70%', delay: '3.5s', dur: '14s', rot: '-7deg'  },
  { n: '73',  top: '88%', left: '72%', delay: '2.5s', dur: '16s', rot: '6deg'   },
  { n: '🌍',  top: '30%', left: '92%', delay: '5s',   dur: '19s', rot: '-4deg'  },
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule,
  ],
  template: `
    <!-- Fondo animado -->
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

    <!-- Panel de login -->
    <div class="login-wrapper">
      <div class="login-panel">
        <div class="panel-header">
          <div class="logo">⚽</div>
          <h1>LAMINY</h1>
          <p>Mundial 2026</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="login-form">
          <div class="field-wrap">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Usuario</mat-label>
              <input matInput formControlName="username" autocomplete="username">
            </mat-form-field>
          </div>
          <div class="field-wrap">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Contraseña</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password">
            </mat-form-field>
          </div>

          @if (error()) {
            <p class="error-msg">{{ error() }}</p>
          }

          <button mat-raised-button class="submit-btn" type="submit"
                  [disabled]="form.invalid || loading()">
            @if (loading()) {
              <mat-spinner diameter="20" class="spinner-white"></mat-spinner>
            } @else {
              Entrar al álbum
            }
          </button>
        </form>

        <div class="panel-footer">
          <a routerLink="/forgot-password">¿Olvidaste tu contraseña?</a>
          <span class="divider">·</span>
          <a routerLink="/register">Crear cuenta</a>
        </div>

        <div class="back-home">
          <a routerLink="/">← Volver al inicio</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; min-height: 100vh; overflow: hidden; }

    /* ── FONDO ── */
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

    /* líneas campo de fútbol */
    .field-lines { position: absolute; inset: 0; }
    .line {
      position: absolute; background: rgba(255,255,255,.04);
      border-radius: 2px;
    }
    .l1 { width: 1px; height: 100%; left: 50%; top: 0; }
    .l2 { width: 100%; height: 1px; left: 0; top: 50%; }
    .circle-field {
      position: absolute; border-radius: 50%;
      border: 1px solid rgba(255,255,255,.05);
    }
    .cf1 { width: 220px; height: 220px; top: 50%; left: 50%; transform: translate(-50%,-50%); }
    .cf2 { width: 420px; height: 420px; top: 50%; left: 50%; transform: translate(-50%,-50%); }

    /* láminas flotantes */
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
      0%   { transform: translateY(0px) rotate(var(--r, 0deg));   opacity: .25; }
      25%  { transform: translateY(-30px) rotate(calc(var(--r, 0deg) + 4deg)); opacity: .45; }
      50%  { transform: translateY(-60px) rotate(var(--r, 0deg));  opacity: .35; }
      75%  { transform: translateY(-30px) rotate(calc(var(--r, 0deg) - 4deg)); opacity: .45; }
      100% { transform: translateY(0px) rotate(var(--r, 0deg));   opacity: .25; }
    }

    /* ── PANEL ── */
    .login-wrapper {
      position: relative; z-index: 10;
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .login-panel {
      width: 100%; max-width: 400px;
      background: rgba(255,255,255,.06);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 24px;
      padding: 40px 36px 28px;
      box-shadow: 0 24px 64px rgba(0,0,0,.5);
      animation: panelIn .5s cubic-bezier(.22,.61,.36,1) both;
    }
    @keyframes panelIn {
      from { opacity: 0; transform: translateY(24px) scale(.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }

    .panel-header { text-align: center; margin-bottom: 28px; }
    .logo { font-size: 48px; line-height: 1; margin-bottom: 8px; }
    .panel-header h1 {
      font-size: 26px; font-weight: 800;
      color: #fff; margin: 0 0 4px;
      letter-spacing: -.5px;
    }
    .panel-header p { font-size: 13px; color: rgba(255,255,255,.45); margin: 0; }

    .login-form { display: flex; flex-direction: column; gap: 4px; }
    .field-wrap ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .full-width { width: 100%; }

    /* Campos con estilo oscuro */
    ::ng-deep .login-panel .mat-mdc-text-field-wrapper {
      background: rgba(255,255,255,.07) !important;
    }
    ::ng-deep .login-panel .mdc-text-field--outlined .mdc-notched-outline__leading,
    ::ng-deep .login-panel .mdc-text-field--outlined .mdc-notched-outline__notch,
    ::ng-deep .login-panel .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: rgba(255,255,255,.2) !important;
    }
    ::ng-deep .login-panel .mdc-text-field--focused .mdc-notched-outline__leading,
    ::ng-deep .login-panel .mdc-text-field--focused .mdc-notched-outline__notch,
    ::ng-deep .login-panel .mdc-text-field--focused .mdc-notched-outline__trailing {
      border-color: #42a5f5 !important;
    }
    ::ng-deep .login-panel .mat-mdc-input-element { color: #fff !important; }
    ::ng-deep .login-panel .mat-mdc-floating-label { color: rgba(255,255,255,.55) !important; }

    .error-msg {
      color: #ef9a9a; font-size: 13px;
      background: rgba(239,83,80,.15);
      border: 1px solid rgba(239,83,80,.3);
      border-radius: 8px; padding: 8px 12px; margin: 0;
    }
    .submit-btn {
      width: 100%; height: 48px !important;
      font-size: 15px !important; font-weight: 700 !important;
      background: linear-gradient(135deg, #1565c0 0%, #1e88e5 100%) !important;
      color: #fff !important; border-radius: 12px !important;
      box-shadow: 0 4px 16px rgba(21,101,192,.4) !important;
      margin-top: 8px;
      transition: box-shadow .2s, transform .1s !important;
    }
    .submit-btn:hover:not(:disabled) {
      box-shadow: 0 6px 20px rgba(21,101,192,.6) !important;
      transform: translateY(-1px);
    }
    ::ng-deep .spinner-white circle { stroke: #fff !important; }

    .panel-footer {
      display: flex; justify-content: center; align-items: center;
      gap: 8px; margin-top: 20px; font-size: 13px;
    }
    .panel-footer a { color: rgba(255,255,255,.6); text-decoration: none; }
    .panel-footer a:hover { color: #fff; }
    .divider { color: rgba(255,255,255,.3); }

    .back-home {
      text-align: center; margin-top: 12px;
    }
    .back-home a { font-size: 12px; color: rgba(255,255,255,.3); text-decoration: none; }
    .back-home a:hover { color: rgba(255,255,255,.6); }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  stickers = STICKERS;

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  loading = signal(false);
  error = signal('');

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => this.router.navigate(['/albums']),
      error: (err) => {
        this.error.set(err.error?.detail ?? 'Credenciales incorrectas');
        this.loading.set(false);
      },
    });
  }
}
