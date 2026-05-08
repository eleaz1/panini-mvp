import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { AlbumService, SwapMatch } from '../../core/services/album.service';

@Component({
  selector: 'app-swap-matches',
  standalone: true,
  imports: [
    MatButtonModule, MatIconModule, MatCardModule,
    MatChipsModule, MatProgressSpinnerModule, MatBadgeModule,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <button mat-icon-button (click)="back()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Posibles intercambios</h1>
      </header>

      @if (loading()) {
        <div class="centered"><mat-spinner></mat-spinner></div>
      } @else if (swaps().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">swap_horiz</mat-icon>
          <p>No hay intercambios posibles aún.<br>Más amigos necesitan registrar sus láminas.</p>
        </div>
      } @else {
        <div class="swaps-list">
          @for (swap of swaps(); track swap.friend_id) {
            <mat-card class="swap-card">
              <mat-card-header>
                <mat-card-title>{{ swap.friend_username }}</mat-card-title>
                <mat-card-subtitle>{{ swap.total_possible }} intercambio(s) posible(s)</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                @if (swap.can_give.length > 0) {
                  <div class="swap-section">
                    <p class="swap-label give">Puedo darle (mis repetidas que le faltan)</p>
                    <div class="sticker-chips">
                      @for (n of swap.can_give; track n) {
                        <span class="sticker-chip give">{{ n }}</span>
                      }
                    </div>
                  </div>
                }
                @if (swap.can_receive.length > 0) {
                  <div class="swap-section">
                    <p class="swap-label receive">Puede darme (sus repetidas que me faltan)</p>
                    <div class="sticker-chips">
                      @for (n of swap.can_receive; track n) {
                        <span class="sticker-chip receive">{{ n }}</span>
                      }
                    </div>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .page-header h1 { margin: 0; }
    .swaps-list { display: flex; flex-direction: column; gap: 16px; }
    .swap-card {}
    .swap-section { margin-bottom: 12px; }
    .swap-label { font-size: 13px; font-weight: 600; margin: 0 0 6px; }
    .swap-label.give { color: #f57c00; }
    .swap-label.receive { color: #2e7d32; }
    .sticker-chips { display: flex; flex-wrap: wrap; gap: 4px; }
    .sticker-chip {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .sticker-chip.give { background: #fff3e0; color: #e65100; border: 1px solid #ff9800; }
    .sticker-chip.receive { background: #e8f5e9; color: #2e7d32; border: 1px solid #4caf50; }
    .centered { display: flex; justify-content: center; padding: 64px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px; text-align: center; }
    .empty-icon { font-size: 64px; height: 64px; width: 64px; color: rgba(0,0,0,.2); }
  `],
})
export class SwapMatchesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private albumService = inject(AlbumService);

  swaps = signal<SwapMatch[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    const albumId = Number(this.route.snapshot.paramMap.get('id'));
    this.albumService.getSwapMatches(albumId).subscribe({
      next: (swaps) => { this.swaps.set(swaps); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  back(): void {
    const albumId = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['/albums', albumId]);
  }
}
