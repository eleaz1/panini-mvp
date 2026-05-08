import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
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
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatProgressSpinnerModule,
    MatTooltipModule, MatMenuModule,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Mis álbumes</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openForm()">
            <mat-icon>add</mat-icon> Nuevo álbum
          </button>
          <button mat-icon-button [matMenuTriggerFor]="userMenu" matTooltip="Cuenta">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon> Cerrar sesión
            </button>
          </mat-menu>
        </div>
      </header>

      @if (loading()) {
        <div class="centered"><mat-spinner></mat-spinner></div>
      } @else if (albums().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">collections_bookmark</mat-icon>
          <p>No tienes álbumes aún. ¡Crea uno!</p>
          <button mat-raised-button color="primary" (click)="openForm()">Crear álbum</button>
        </div>
      } @else {
        <div class="albums-grid">
          @for (album of albums(); track album.id) {
            <mat-card class="album-card" (click)="openAlbum(album)">
              <mat-card-header>
                <mat-card-title>{{ album.name }}</mat-card-title>
                <mat-card-subtitle>{{ album.total_stickers }} láminas</mat-card-subtitle>
                <button mat-icon-button class="card-menu-btn"
                        [matMenuTriggerFor]="cardMenu"
                        (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #cardMenu>
                  <button mat-menu-item (click)="openForm(album); $event.stopPropagation()">
                    <mat-icon>edit</mat-icon> Editar
                  </button>
                  <button mat-menu-item (click)="deleteAlbum(album); $event.stopPropagation()">
                    <mat-icon color="warn">delete</mat-icon> Eliminar
                  </button>
                </mat-menu>
              </mat-card-header>
              <mat-card-content>
                <p class="description">{{ album.description || 'Sin descripción' }}</p>
                <mat-progress-bar mode="determinate" [value]="0" class="progress-bar"></mat-progress-bar>
                <p class="progress-label">0% completado</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-button color="primary" (click)="openAlbum(album); $event.stopPropagation()">
                  Ver láminas
                </button>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-header h1 { margin: 0; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .albums-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .album-card { cursor: pointer; transition: box-shadow .2s; position: relative; }
    .album-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.2); }
    .card-menu-btn { position: absolute; top: 8px; right: 8px; }
    .description { color: rgba(0,0,0,.6); font-size: 14px; margin: 8px 0; min-height: 40px; }
    .progress-bar { margin: 8px 0 4px; }
    .progress-label { font-size: 12px; color: rgba(0,0,0,.5); margin: 0; }
    .centered { display: flex; justify-content: center; padding: 64px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px; text-align: center; }
    .empty-icon { font-size: 64px; height: 64px; width: 64px; color: rgba(0,0,0,.2); }
  `],
})
export class AlbumListComponent implements OnInit {
  private albumService = inject(AlbumService);
  private auth = inject(AuthService);
  private router = inject(Router);
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
