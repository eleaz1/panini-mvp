import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { AlbumService, Album, StickerStatus, AlbumStats } from '../../core/services/album.service';

@Component({
  selector: 'app-sticker-grid',
  standalone: true,
  imports: [
    DecimalPipe,
    MatButtonModule, MatIconModule, MatProgressBarModule,
    MatProgressSpinnerModule, MatChipsModule, MatTooltipModule, MatBadgeModule,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <button mat-icon-button (click)="back()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-title">
          <h1>{{ album()?.name ?? 'Álbum' }}</h1>
          <span class="subtitle">{{ album()?.total_stickers }} láminas</span>
        </div>
        <button mat-icon-button routerLink="swaps" matTooltip="Ver intercambios">
          <mat-icon>swap_horiz</mat-icon>
        </button>
      </header>

      @if (stats()) {
        <div class="stats-bar">
          <div class="stat">
            <span class="stat-value have">{{ stats()!.have }}</span>
            <span class="stat-label">Tengo</span>
          </div>
          <div class="stat">
            <span class="stat-value missing">{{ stats()!.missing }}</span>
            <span class="stat-label">Faltan</span>
          </div>
          <div class="stat">
            <span class="stat-value duplicate">{{ stats()!.duplicate }}</span>
            <span class="stat-label">Repetidas</span>
          </div>
          <div class="stat completion">
            <span class="stat-value">{{ stats()!.completion_pct | number:'1.1-1' }}%</span>
            <span class="stat-label">Completo</span>
          </div>
        </div>
        <mat-progress-bar mode="determinate" [value]="stats()!.completion_pct" class="main-progress"></mat-progress-bar>
      }

      <div class="filter-row">
        <mat-chip-set>
          @for (f of filters; track f.value) {
            <mat-chip [highlighted]="activeFilter() === f.value"
                      (click)="setFilter(f.value)">{{ f.label }}</mat-chip>
          }
        </mat-chip-set>
      </div>

      @if (loading()) {
        <div class="centered"><mat-spinner></mat-spinner></div>
      } @else {
        <div class="sticker-grid">
          @for (n of visibleNumbers(); track n) {
            <button class="sticker-cell {{ stickerStatus(n) }}"
                    [matTooltip]="stickerTooltip(n)"
                    (click)="cycleSticker(n)"
                    [disabled]="updating().has(n)">
              {{ n }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .header-title { flex: 1; }
    .header-title h1 { margin: 0; line-height: 1.2; }
    .subtitle { font-size: 13px; color: rgba(0,0,0,.5); }

    .stats-bar { display: flex; gap: 24px; padding: 16px 0; flex-wrap: wrap; }
    .stat { display: flex; flex-direction: column; align-items: center; min-width: 64px; }
    .stat-value { font-size: 24px; font-weight: 700; line-height: 1; }
    .stat-value.have { color: #2e7d32; }
    .stat-value.missing { color: #757575; }
    .stat-value.duplicate { color: #f57c00; }
    .stat-label { font-size: 11px; color: rgba(0,0,0,.5); text-transform: uppercase; margin-top: 2px; }
    .main-progress { margin-bottom: 16px; height: 6px; border-radius: 3px; }

    .filter-row { margin-bottom: 16px; }

    .sticker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
      gap: 6px;
    }

    .sticker-cell {
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all .15s;
      color: #9e9e9e;
      padding: 0;
    }
    .sticker-cell:hover:not(:disabled) { transform: scale(1.1); z-index: 1; }
    .sticker-cell:disabled { opacity: .5; cursor: wait; }

    .sticker-cell.have {
      background: #e8f5e9;
      border-color: #4caf50;
      color: #2e7d32;
    }
    .sticker-cell.duplicate {
      background: #fff3e0;
      border-color: #ff9800;
      color: #e65100;
    }
    .sticker-cell.missing {
      background: #fafafa;
      border-color: #e0e0e0;
      color: #9e9e9e;
    }

    .centered { display: flex; justify-content: center; padding: 64px; }
  `],
})
export class StickerGridComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private albumService = inject(AlbumService);

  albumId = signal(0);
  album = signal<Album | null>(null);
  stickers = signal<Map<number, StickerStatus>>(new Map());
  stats = signal<AlbumStats | null>(null);
  loading = signal(true);
  updating = signal<Set<number>>(new Set());
  activeFilter = signal<'all' | StickerStatus>('all');

  filters = [
    { label: 'Todas', value: 'all' as const },
    { label: 'Tengo', value: 'have' as const },
    { label: 'Faltan', value: 'missing' as const },
    { label: 'Repetidas', value: 'duplicate' as const },
  ];

  visibleNumbers = computed(() => {
    const total = this.album()?.total_stickers ?? 0;
    const all = Array.from({ length: total }, (_, i) => i + 1);
    const filter = this.activeFilter();
    if (filter === 'all') return all;
    return all.filter(n => this.stickerStatus(n) === filter);
  });

  ngOnInit(): void {
    this.albumId.set(Number(this.route.snapshot.paramMap.get('id')));
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const id = this.albumId();
    this.albumService.getAlbums().subscribe(albums => {
      this.album.set(albums.find(a => a.id === id) ?? null);
    });
    this.albumService.getStickers(id).subscribe(stickers => {
      const map = new Map<number, StickerStatus>();
      stickers.forEach(s => map.set(s.number, s.status));
      this.stickers.set(map);
      this.loading.set(false);
    });
    this.albumService.getStats(id).subscribe(s => this.stats.set(s));
  }

  stickerStatus(n: number): StickerStatus | 'missing' {
    return this.stickers().get(n) ?? 'missing';
  }

  stickerTooltip(n: number): string {
    const map: Record<string, string> = { missing: 'Falta', have: 'La tengo', duplicate: 'Repetida' };
    return `#${n} — ${map[this.stickerStatus(n)]}`;
  }

  cycleSticker(n: number): void {
    const current = this.stickerStatus(n);
    const next: Record<string, StickerStatus> = { missing: 'have', have: 'duplicate', duplicate: 'missing' };
    const newStatus = next[current];

    this.updating.update(s => new Set(s).add(n));
    this.albumService.updateSticker(this.albumId(), n, newStatus).subscribe({
      next: (updated) => {
        this.stickers.update(map => { const m = new Map(map); m.set(n, updated.status); return m; });
        this.updating.update(s => { const ns = new Set(s); ns.delete(n); return ns; });
        this.albumService.getStats(this.albumId()).subscribe(s => this.stats.set(s));
      },
      error: () => this.updating.update(s => { const ns = new Set(s); ns.delete(n); return ns; }),
    });
  }

  setFilter(f: 'all' | StickerStatus): void {
    this.activeFilter.set(f);
  }

  back(): void {
    this.router.navigate(['/albums']);
  }
}
