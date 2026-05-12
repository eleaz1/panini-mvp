import { Component, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { AlbumService, Album } from '../../core/services/album.service';
import { AuthService } from '../../core/services/auth.service';
import { AlbumFormComponent } from './album-form.component';

@Component({
  selector: 'app-album-list',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule, MatIconModule,
    MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatMenuModule,
  ],
  template: `
    <div class="app-shell">

      <!-- ── App header ─────────────────────────────────── -->
      <header class="app-header">
        <div class="header-inner">
          <div class="brand">
            <span class="brand-ball">⚽</span>
            <span class="brand-name">Panini 2026</span>
          </div>
          <div class="header-right">
            @if (auth.isAdmin()) {
              <button mat-icon-button class="header-icon-btn"
                      (click)="router.navigate(['/admin/templates'])"
                      matTooltip="Panel de administración">
                <mat-icon>admin_panel_settings</mat-icon>
              </button>
            }
            <button mat-icon-button class="header-icon-btn avatar-btn"
                    [matMenuTriggerFor]="userMenu" matTooltip="Mi cuenta">
              <mat-icon>account_circle</mat-icon>
            </button>
            <mat-menu #userMenu="matMenu">
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon> Cerrar sesión
              </button>
            </mat-menu>
          </div>
        </div>
      </header>

      <!-- ── Page body ──────────────────────────────────── -->
      <main class="page-body">

        <div class="section-header">
          <div>
            <h1 class="section-title">Mis álbumes</h1>
            <p class="section-sub">Gestiona tu colección de láminas</p>
          </div>
          <button mat-flat-button class="btn-new" (click)="openForm()">
            <mat-icon>add</mat-icon> Nuevo álbum
          </button>
        </div>

        @if (loading()) {
          <div class="centered"><mat-spinner diameter="48"></mat-spinner></div>

        } @else if (albums().length === 0) {
          <div class="empty-state">
            <div class="empty-illustration">📚</div>
            <h2 class="empty-title">Sin álbumes todavía</h2>
            <p class="empty-sub">Crea tu primer álbum para empezar a registrar tus láminas.</p>
            <button mat-flat-button class="btn-new" (click)="openForm()">
              <mat-icon>add</mat-icon> Crear álbum
            </button>
          </div>

        } @else {
          <div class="albums-grid">
            @for (album of albums(); track album.id) {
              <div class="album-card" (click)="openAlbum(album)">
                <div class="card-accent"></div>
                <div class="card-body">
                  <div class="card-top">
                    <div class="card-info">
                      <h3 class="card-title">{{ album.name }}</h3>
                      <p class="card-sub">{{ album.total_stickers | number }} láminas</p>
                    </div>
                    <button mat-icon-button class="card-menu-btn"
                            [matMenuTriggerFor]="cardMenu"
                            (click)="$event.stopPropagation()">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #cardMenu="matMenu">
                      <button mat-menu-item (click)="openForm(album); $event.stopPropagation()">
                        <mat-icon>edit</mat-icon> Editar
                      </button>
                      <button mat-menu-item class="menu-danger"
                              (click)="deleteAlbum(album); $event.stopPropagation()">
                        <mat-icon>delete</mat-icon> Eliminar
                      </button>
                    </mat-menu>
                  </div>

                  <p class="card-desc">{{ album.description || 'Sin descripción' }}</p>

                  <div class="card-footer">
                    <div class="progress-wrap">
                      <mat-progress-bar mode="determinate" [value]="0" class="card-progress"></mat-progress-bar>
                      <span class="progress-pct">0%</span>
                    </div>
                    <button mat-stroked-button class="btn-view"
                            (click)="openAlbum(album); $event.stopPropagation()">
                      Ver láminas <mat-icon>chevron_right</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

      </main>
    </div>
  `,
  styles: [`
    /* ── Shell ─────────────────────────────────── */
    .app-shell {
      min-height: 100vh;
      background: #f0f4f8;
      font-family: inherit;
    }

    /* ── App header ─────────────────────────────── */
    .app-header {
      background: #1a237e;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }
    .header-inner {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-ball { font-size: 22px; }
    .brand-name {
      color: #fff;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -.3px;
    }
    .header-right { display: flex; align-items: center; gap: 4px; }
    .header-icon-btn { color: rgba(255,255,255,.85) !important; }
    .header-icon-btn:hover { color: #fff !important; background: rgba(255,255,255,.12) !important; }

    /* ── Page body ──────────────────────────────── */
    .page-body {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }

    /* ── Section header ─────────────────────────── */
    .section-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      margin-bottom: 28px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .section-title {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      color: #1a237e;
      letter-spacing: -.5px;
    }
    .section-sub { margin: 4px 0 0; color: #78909c; font-size: 14px; }
    .btn-new {
      background: #1565c0 !important;
      color: #fff !important;
      border-radius: 24px !important;
      font-weight: 600 !important;
      padding: 0 20px !important;
      height: 40px !important;
      display: flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .btn-new mat-icon { font-size: 20px; height: 20px; width: 20px; }

    /* ── Album grid ─────────────────────────────── */
    .albums-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    /* ── Album card ─────────────────────────────── */
    .album-card {
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,.07);
      overflow: hidden;
      cursor: pointer;
      transition: transform .18s, box-shadow .18s;
      display: flex;
      flex-direction: column;
    }
    .album-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(21,101,192,.18);
    }
    .card-accent {
      height: 5px;
      background: linear-gradient(90deg, #1565c0, #42a5f5);
    }
    .card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
    .card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .card-info { flex: 1; min-width: 0; }
    .card-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #1a237e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-sub { margin: 3px 0 0; font-size: 13px; color: #90a4ae; }
    .card-menu-btn { color: #b0bec5 !important; flex-shrink: 0; margin: -4px -4px 0 0; }
    .menu-danger { color: #c62828 !important; }
    .menu-danger mat-icon { color: #c62828 !important; }
    .card-desc {
      font-size: 14px;
      color: #607d8b;
      margin: 0;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 40px;
    }
    .card-footer { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
    .progress-wrap { display: flex; align-items: center; gap: 10px; }
    .card-progress { flex: 1; height: 6px !important; border-radius: 3px; }
    .progress-pct { font-size: 12px; font-weight: 600; color: #78909c; white-space: nowrap; }
    .btn-view {
      align-self: flex-end;
      border-radius: 20px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #1565c0 !important;
      border-color: #90caf9 !important;
      padding: 0 14px !important;
      height: 34px !important;
      display: flex;
      align-items: center;
      gap: 0;
    }
    .btn-view mat-icon { font-size: 18px; height: 18px; width: 18px; margin-left: -2px; }

    /* ── Empty state ────────────────────────────── */
    .centered { display: flex; justify-content: center; padding: 80px; }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 80px 24px;
      text-align: center;
    }
    .empty-illustration { font-size: 72px; line-height: 1; }
    .empty-title { margin: 0; font-size: 22px; font-weight: 700; color: #37474f; }
    .empty-sub { margin: 0; color: #90a4ae; font-size: 15px; max-width: 320px; }
  `],
})
export class AlbumListComponent implements OnInit {
  private albumService = inject(AlbumService);
  protected auth = inject(AuthService);
  protected router = inject(Router);
  private dialog = inject(MatDialog);

  albums = signal<Album[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.loadAlbums();
  }

  loadAlbums(): void {
    this.loading.set(true);
    this.albumService.getAlbums().subscribe({
      next: (albums) => { this.albums.set(albums); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(album?: Album): void {
    const ref = this.dialog.open(AlbumFormComponent, { data: { album }, width: '420px' });
    ref.afterClosed().subscribe(result => { if (result) this.loadAlbums(); });
  }

  openAlbum(album: Album): void {
    this.router.navigate(['/albums', album.id]);
  }

  deleteAlbum(album: Album): void {
    if (!confirm(`¿Eliminar "${album.name}"?`)) return;
    this.albumService.deleteAlbum(album.id).subscribe(() => this.loadAlbums());
  }

  logout(): void {
    this.auth.logout();
  }
}
