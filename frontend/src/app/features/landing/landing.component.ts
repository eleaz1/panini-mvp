import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <!-- NAV -->
    <nav class="navbar">
      <div class="nav-brand">
        <span class="brand-icon">⚽</span>
        <span class="brand-name">LAMINY</span>
      </div>
      <div class="nav-actions">
        <a mat-button routerLink="/login" class="nav-login">Iniciar sesión</a>
        <a mat-raised-button color="primary" routerLink="/register">Registrarse</a>
      </div>
    </nav>

    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg">
        <div class="circle c1"></div>
        <div class="circle c2"></div>
        <div class="circle c3"></div>
        <div class="sticker-float s1">1</div>
        <div class="sticker-float s2">⚽</div>
        <div class="sticker-float s3">47</div>
        <div class="sticker-float s4">🏆</div>
        <div class="sticker-float s5">128</div>
      </div>
      <div class="hero-content">
        <div class="badge">Mundial 2026 · USA · México · Canadá</div>
        <h1 class="hero-title">
          Tu álbum Panini,<br>
          <span class="accent">siempre al día</span>
        </h1>
        <p class="hero-subtitle">
          Registra tus láminas, descubre qué te falta y coordina intercambios
          automáticamente con tus amigos. Todo en un solo lugar.
        </p>
        <div class="hero-ctas">
          <a mat-raised-button color="primary" routerLink="/register" class="cta-primary">
            Empezar gratis
          </a>
          <a mat-stroked-button routerLink="/login" class="cta-secondary">
            Ya tengo cuenta
          </a>
        </div>
        <p class="hero-note">🔒 Solo para tu grupo de amigos — sin datos de tarjeta</p>
      </div>
    </section>

    <!-- STATS -->
    <section class="stats-bar">
      <div class="stat-item">
        <span class="stat-num">638</span>
        <span class="stat-label">Láminas del álbum</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num">32</span>
        <span class="stat-label">Selecciones</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num">∞</span>
        <span class="stat-label">Intercambios posibles</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-num">~20</span>
        <span class="stat-label">Amigos en tu grupo</span>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="features">
      <div class="section-header">
        <h2>Todo lo que necesitas para completar tu álbum</h2>
        <p>Sin hojas de cálculo, sin confusión — solo tu álbum digital</p>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feat-icon">📋</div>
          <h3>Registro visual</h3>
          <p>Grid completo con todas las láminas. Toca para ciclar entre <em>falta → tengo → repetida</em> al instante.</p>
        </div>
        <div class="feature-card">
          <div class="feat-icon">🔄</div>
          <h3>Intercambios automáticos</h3>
          <p>El sistema calcula quién de tus amigos tiene repetidas que a ti te faltan, y viceversa.</p>
        </div>
        <div class="feature-card">
          <div class="feat-icon">📊</div>
          <h3>Progreso en tiempo real</h3>
          <p>Ve cuánto llevas completado, cuántas te faltan y cuántas están duplicadas en cualquier momento.</p>
        </div>
        <div class="feature-card">
          <div class="feat-icon">🏆</div>
          <h3>Múltiples álbumes</h3>
          <p>¿Copa América, Champions? Gestiona todos tus álbumes desde el mismo panel sin cambiar nada.</p>
        </div>
        <div class="feature-card">
          <div class="feat-icon">🔒</div>
          <h3>Privado y seguro</h3>
          <p>Solo tú y tu grupo tienen acceso. Autenticación con JWT y verificación por correo.</p>
        </div>
        <div class="feature-card">
          <div class="feat-icon">📱</div>
          <h3>Funciona en móvil</h3>
          <p>Diseño responsive — actualiza tu álbum mientras abres el sobre en el quiosco.</p>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="how-it-works">
      <div class="section-header light">
        <h2>¿Cómo funciona?</h2>
        <p>En tres pasos estás listo</p>
      </div>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <h3>Regístrate</h3>
          <p>Crea tu cuenta con tu correo. Te enviamos un enlace de verificación para que todo sea seguro.</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-num">2</div>
          <h3>Crea tu álbum</h3>
          <p>Dale un nombre y define el total de láminas. El grid aparece listo para que empieces a marcar.</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-num">3</div>
          <h3>Invita a tus amigos</h3>
          <p>Cuando ellos también registren sus láminas, el sistema encuentra automáticamente los intercambios.</p>
        </div>
      </div>
    </section>

    <!-- CTA FINAL -->
    <section class="cta-section">
      <div class="cta-content">
        <h2>¿Listo para completar tu álbum?</h2>
        <p>Únete gratis antes de que empiece el Mundial</p>
        <a mat-raised-button routerLink="/register" class="cta-big">
          Crear mi cuenta ahora ⚽
        </a>
      </div>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
      <p>LAMINY 2026 · Hecho con ❤️ para amantes del fútbol</p>
      <div class="footer-links">
        <a routerLink="/login">Iniciar sesión</a>
        <a routerLink="/register">Registrarse</a>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; font-family: 'Roboto', sans-serif; }

    /* NAV */
    .navbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 32px;
      background: rgba(10, 14, 26, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,.08);
    }
    .nav-brand { display: flex; align-items: center; gap: 10px; }
    .brand-icon { font-size: 24px; }
    .brand-name { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -.5px; }
    .nav-actions { display: flex; align-items: center; gap: 8px; }
    .nav-login { color: rgba(255,255,255,.8) !important; }

    /* HERO */
    .hero {
      position: relative; min-height: 100vh;
      background: linear-gradient(135deg, #0a0e1a 0%, #0d1b3e 50%, #0a1628 100%);
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; padding: 100px 24px 60px;
    }
    .hero-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .circle {
      position: absolute; border-radius: 50%;
      background: radial-gradient(circle, rgba(25,118,210,.18) 0%, transparent 70%);
      animation: pulse 6s ease-in-out infinite;
    }
    .c1 { width: 600px; height: 600px; top: -100px; right: -100px; animation-delay: 0s; }
    .c2 { width: 400px; height: 400px; bottom: -80px; left: -80px; animation-delay: 2s; }
    .c3 { width: 300px; height: 300px; top: 40%; left: 30%; animation-delay: 4s; }

    .sticker-float {
      position: absolute;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px;
      color: rgba(255,255,255,.4);
      font-size: 18px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      width: 56px; height: 72px;
      animation: floatUp 12s ease-in-out infinite;
    }
    .s1 { left: 8%; top: 65%; animation-delay: 0s; animation-duration: 14s; }
    .s2 { left: 18%; top: 70%; font-size: 28px; animation-delay: 2s; animation-duration: 16s; }
    .s3 { right: 12%; top: 60%; animation-delay: 4s; animation-duration: 13s; }
    .s4 { right: 22%; top: 75%; font-size: 28px; animation-delay: 1s; animation-duration: 15s; }
    .s5 { left: 42%; top: 72%; animation-delay: 3s; animation-duration: 17s; }

    @keyframes floatUp {
      0%   { transform: translateY(0) rotate(-3deg); opacity: .4; }
      50%  { transform: translateY(-80px) rotate(3deg); opacity: .7; }
      100% { transform: translateY(0) rotate(-3deg); opacity: .4; }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: .8; }
      50%       { transform: scale(1.1); opacity: 1; }
    }

    .hero-content {
      position: relative; z-index: 2;
      max-width: 680px; text-align: center;
    }
    .badge {
      display: inline-block;
      background: rgba(25,118,210,.25);
      border: 1px solid rgba(25,118,210,.5);
      color: #90caf9;
      font-size: 13px; font-weight: 600;
      padding: 6px 16px; border-radius: 999px;
      margin-bottom: 24px; letter-spacing: .5px;
    }
    .hero-title {
      font-size: clamp(36px, 6vw, 64px);
      font-weight: 800; color: #fff;
      line-height: 1.1; margin: 0 0 20px;
      letter-spacing: -1px;
    }
    .accent { color: #42a5f5; }
    .hero-subtitle {
      font-size: clamp(16px, 2vw, 20px);
      color: rgba(255,255,255,.65);
      line-height: 1.6; margin: 0 0 36px;
    }
    .hero-ctas { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 16px; }
    .cta-primary { padding: 14px 32px !important; font-size: 16px !important; font-weight: 700 !important; }
    .cta-secondary { padding: 14px 32px !important; font-size: 16px !important; color: rgba(255,255,255,.8) !important; border-color: rgba(255,255,255,.3) !important; }
    .hero-note { font-size: 13px; color: rgba(255,255,255,.4); margin: 0; }

    /* STATS */
    .stats-bar {
      display: flex; justify-content: center; align-items: center;
      flex-wrap: wrap; gap: 0;
      background: #1565c0; padding: 24px 32px;
    }
    .stat-item { text-align: center; padding: 8px 32px; }
    .stat-num { display: block; font-size: 32px; font-weight: 800; color: #fff; line-height: 1; }
    .stat-label { font-size: 13px; color: rgba(255,255,255,.7); margin-top: 4px; display: block; }
    .stat-divider { width: 1px; height: 48px; background: rgba(255,255,255,.2); }

    /* FEATURES */
    .features { padding: 80px 24px; background: #fff; }
    .section-header { text-align: center; margin-bottom: 48px; }
    .section-header h2 { font-size: clamp(24px, 4vw, 36px); font-weight: 800; color: #0d1b3e; margin: 0 0 12px; }
    .section-header p { font-size: 16px; color: #666; margin: 0; }
    .section-header.light h2 { color: #fff; }
    .section-header.light p { color: rgba(255,255,255,.7); }
    .features-grid {
      max-width: 1100px; margin: 0 auto;
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;
    }
    .feature-card {
      padding: 28px; border-radius: 16px;
      border: 1px solid #e8eaf6;
      background: #fafbff;
      transition: transform .2s, box-shadow .2s;
    }
    .feature-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(21,101,192,.12); }
    .feat-icon { font-size: 36px; margin-bottom: 16px; }
    .feature-card h3 { font-size: 18px; font-weight: 700; color: #0d1b3e; margin: 0 0 8px; }
    .feature-card p { font-size: 15px; color: #555; line-height: 1.6; margin: 0; }

    /* HOW IT WORKS */
    .how-it-works {
      padding: 80px 24px;
      background: linear-gradient(135deg, #0d1b3e 0%, #1565c0 100%);
    }
    .steps {
      max-width: 900px; margin: 0 auto;
      display: flex; align-items: center; justify-content: center;
      gap: 16px; flex-wrap: wrap;
    }
    .step { text-align: center; max-width: 220px; padding: 8px; }
    .step-num {
      width: 56px; height: 56px; border-radius: 50%;
      background: rgba(255,255,255,.15);
      border: 2px solid rgba(255,255,255,.4);
      color: #fff; font-size: 22px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
    }
    .step h3 { color: #fff; font-size: 17px; font-weight: 700; margin: 0 0 8px; }
    .step p { color: rgba(255,255,255,.65); font-size: 14px; line-height: 1.5; margin: 0; }
    .step-arrow { font-size: 28px; color: rgba(255,255,255,.4); font-weight: 300; }

    /* CTA FINAL */
    .cta-section {
      padding: 80px 24px;
      background: #f5f7ff; text-align: center;
    }
    .cta-content h2 { font-size: clamp(24px, 4vw, 36px); font-weight: 800; color: #0d1b3e; margin: 0 0 12px; }
    .cta-content p { font-size: 16px; color: #666; margin: 0 0 32px; }
    .cta-big {
      font-size: 18px !important; font-weight: 700 !important;
      padding: 16px 40px !important; border-radius: 8px !important;
      background: #1565c0 !important; color: #fff !important;
    }

    /* FOOTER */
    .footer {
      padding: 24px 32px;
      background: #0a0e1a; color: rgba(255,255,255,.5);
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 12px; font-size: 14px;
    }
    .footer-links { display: flex; gap: 16px; }
    .footer-links a { color: rgba(255,255,255,.5); text-decoration: none; }
    .footer-links a:hover { color: #fff; }
  `],
})
export class LandingComponent {}
