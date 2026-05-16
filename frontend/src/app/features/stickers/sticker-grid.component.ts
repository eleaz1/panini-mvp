import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AlbumService, Album, Sticker, StickerStatus, AlbumStats,
} from '../../core/services/album.service';
import { ReportService } from '../../core/services/report.service';

interface StickerCell {
  number: number;
  display: string;
}

interface SectionGroup {
  name: string;
  group: string;
  code_prefix: string;
  cells: StickerCell[];
}

interface GroupBlock {
  group: string;
  sections: SectionGroup[];
}

const FLAGS: Record<string, string> = {
  MEX: '🇲🇽', RSA: '🇿🇦', KOR: '🇰🇷', CZE: '🇨🇿',
  CAN: '🇨🇦', BIH: '🇧🇦', QAT: '🇶🇦', SUI: '🇨🇭',
  BRA: '🇧🇷', MAR: '🇲🇦', HAI: '🇭🇹', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  USA: '🇺🇸', PAR: '🇵🇾', AUS: '🇦🇺', TUR: '🇹🇷',
  GER: '🇩🇪', CUW: '🇨🇼', CIV: '🇨🇮', ECU: '🇪🇨',
  NED: '🇳🇱', JPN: '🇯🇵', SWE: '🇸🇪', TUN: '🇹🇳',
  BEL: '🇧🇪', EGY: '🇪🇬', IRN: '🇮🇷', NZL: '🇳🇿',
  ESP: '🇪🇸', CPV: '🇨🇻', KSA: '🇸🇦', URU: '🇺🇾',
  FRA: '🇫🇷', SEN: '🇸🇳', IRQ: '🇮🇶', NOR: '🇳🇴',
  ARG: '🇦🇷', ALG: '🇩🇿', AUT: '🇦🇹', JOR: '🇯🇴',
  POR: '🇵🇹', COD: '🇨🇩', UZB: '🇺🇿', COL: '🇨🇴',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', CRO: '🇭🇷', GHA: '🇬🇭', PAN: '🇵🇦',
  FWC: '🏆',
};

@Component({
  selector: 'app-sticker-grid',
  standalone: true,
  imports: [
    DecimalPipe, RouterLink, FormsModule,
    MatButtonModule, MatIconModule, MatProgressBarModule,
    MatProgressSpinnerModule, MatChipsModule, MatTooltipModule,
    MatSelectModule, MatFormFieldModule, MatMenuModule, MatDividerModule,
  ],
  template: `
    <div class="app-shell">

      <!-- ── Top bar ─────────────────────────────────── -->
      <header class="top-bar">
        <button mat-icon-button class="back-btn" (click)="back()" matTooltip="Volver a mis álbumes">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="top-bar-title">
          <h1 class="album-name">{{ album()?.name ?? 'Álbum' }}</h1>
          <span class="album-sub">{{ album()?.total_stickers | number }} láminas en total</span>
        </div>
        <a mat-stroked-button class="swaps-btn" [routerLink]="['swaps']" matTooltip="Calcular intercambios">
          <mat-icon>swap_horiz</mat-icon>
          <span class="swaps-label">Intercambios</span>
        </a>
        <button class="pdf-btn" (click)="downloadComplete()" matTooltip="Descargar reporte completo (colores por estado)">
          <mat-icon>picture_as_pdf</mat-icon>
          <span class="pdf-label">Completo</span>
        </button>
        <button class="pdf-btn pdf-btn--missing" (click)="downloadMissing()" matTooltip="Descargar lista de láminas faltantes para compartir">
          <mat-icon>share</mat-icon>
          <span class="pdf-label">Faltantes</span>
        </button>
        <button class="pdf-btn pdf-btn--whatsapp" [matMenuTriggerFor]="waMenu" matTooltip="Compartir en WhatsApp">
          <mat-icon>chat</mat-icon>
          <span class="pdf-label">WhatsApp</span>
        </button>
        <mat-menu #waMenu="matMenu">
          <div mat-menu-item disabled style="font-size:11px;opacity:.55;min-height:28px;line-height:28px;padding:0 16px;pointer-events:none">Enviar por WhatsApp</div>
          <button mat-menu-item (click)="shareWhatsApp('duplicate')">
            <mat-icon style="color:#e65100">repeat</mat-icon>
            <span>Repetidas ({{ stats()?.duplicate ?? 0 }})</span>
          </button>
          <button mat-menu-item (click)="shareWhatsApp('missing')">
            <mat-icon style="color:#546e7a">help_outline</mat-icon>
            <span>Me faltan ({{ stats()?.missing ?? 0 }})</span>
          </button>
          <mat-divider></mat-divider>
          <div mat-menu-item disabled style="font-size:11px;opacity:.55;min-height:28px;line-height:28px;padding:0 16px;pointer-events:none">Copiar texto</div>
          <button mat-menu-item (click)="copyToClipboard('duplicate')">
            <mat-icon>content_copy</mat-icon>
            <span>Copiar repetidas</span>
          </button>
          <button mat-menu-item (click)="copyToClipboard('missing')">
            <mat-icon>content_copy</mat-icon>
            <span>Copiar faltantes</span>
          </button>
        </mat-menu>
      </header>

      <!-- ── Stats strip ─────────────────────────────── -->
      @if (stats()) {
        <div class="stats-strip">
          <div class="stats-inner">
            <div class="stat-card have-card">
              <span class="stat-num">{{ stats()!.have | number }}</span>
              <span class="stat-lbl">Tengo</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-card missing-card">
              <span class="stat-num">{{ stats()!.missing | number }}</span>
              <span class="stat-lbl">Faltan</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-card dup-card">
              <span class="stat-num">{{ stats()!.duplicate | number }}</span>
              <span class="stat-lbl">Repetidas</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-card pct-card">
              <span class="stat-num">{{ stats()!.completion_pct | number:'1.0-1' }}%</span>
              <span class="stat-lbl">Completo</span>
            </div>
          </div>
          <mat-progress-bar
            mode="determinate"
            [value]="stats()!.completion_pct"
            class="main-progress">
          </mat-progress-bar>
        </div>
      }

      <!-- ── Controls ────────────────────────────────── -->
      <div class="controls-wrap">
        <div class="controls-inner">
          <!-- Filter chips -->
          <div class="filter-chips">
            @for (f of filters; track f.value) {
              <button class="filter-chip"
                      [class.active]="activeFilter() === f.value"
                      [class.chip-all]="f.value === 'all'"
                      [class.chip-have]="f.value === 'have'"
                      [class.chip-missing]="f.value === 'missing'"
                      [class.chip-dup]="f.value === 'duplicate'"
                      (click)="setFilter(f.value)">
                {{ f.label }}
              </button>
            }
          </div>

          <div class="controls-right">
            <!-- Sección/país -->
            @if (sections().length > 0) {
              <mat-form-field appearance="outline" class="section-select">
                <mat-label>País / Sección</mat-label>
                <mat-select [(ngModel)]="activeSectionName" (ngModelChange)="onSectionChange()">
                  <mat-option value="">Todos</mat-option>
                  @for (block of groupedSections(); track block.group) {
                    @if (block.group) {
                      <mat-optgroup [label]="'Grupo ' + block.group">
                        @for (s of block.sections; track s.name) {
                          <mat-option [value]="s.name">{{ flag(s) }} {{ s.name }} · {{ sectionCount(s) }}</mat-option>
                        }
                      </mat-optgroup>
                    } @else {
                      @for (s of block.sections; track s.name) {
                        <mat-option [value]="s.name">{{ flag(s) }} {{ s.name }} · {{ sectionCount(s) }}</mat-option>
                      }
                    }
                  }
                </mat-select>
              </mat-form-field>
            }

            <!-- Marcar todas -->
            <button class="mark-all-btn"
                    [disabled]="markingAll()"
                    (click)="markAllVisible()"
                    matTooltip="Marcar como 'tengo' las láminas visibles">
              @if (markingAll()) {
                <mat-spinner diameter="16"></mat-spinner>
              } @else {
                <mat-icon>done_all</mat-icon>
              }
              Marcar todas
            </button>
          </div>
        </div>
      </div>

      <!-- ── Grid content ─────────────────────────────── -->
      <div class="grid-content">

        @if (loading()) {
          <div class="centered"><mat-spinner diameter="48"></mat-spinner></div>

        } @else if (sections().length > 0) {
          <!-- Vista agrupada por sección -->
          @for (block of groupedSections(); track block.group) {
            @if (block.group) {
              <div class="group-header">
                <span class="group-label">Grupo {{ block.group }}</span>
              </div>
            }
            @for (section of block.sections; track section.name) {
              @let cells = visibleCells(section.cells);
              @if (cells.length > 0) {
                <div class="section-block">
                  <div class="section-header">
                    @if (flag(section)) {
                      <span class="section-flag">{{ flag(section) }}</span>
                    }
                    <span class="section-name">{{ section.name }}</span>
                    <span class="section-badge">{{ sectionStatusSummary(section) }}</span>
                  </div>
                  <div class="sticker-grid template-grid">
                    @for (cell of cells; track cell.number) {
                      <button class="sticker-cell {{ cellStatus(cell.number) }}"
                              [matTooltip]="cellTooltip(cell)"
                              (click)="cycleSticker(cell.number)"
                              [disabled]="updating().has(cell.number)">
                        {{ cell.display }}
                      </button>
                    }
                  </div>
                </div>
              }
            }
          }
          @if (visibleSections().length === 0 || allVisibleEmpty()) {
            <div class="empty-filter">
              <span class="empty-filter-icon">✅</span>
              <p>No hay láminas con ese filtro{{ activeSectionName ? ' en ' + activeSectionName : '' }}.</p>
            </div>
          }

        } @else {
          <!-- Vista numérica plana -->
          <div class="sticker-grid">
            @for (n of visiblePlain(); track n) {
              <button class="sticker-cell {{ cellStatus(n) }}"
                      [matTooltip]="'#' + n + ' — ' + statusLabel(cellStatus(n))"
                      (click)="cycleSticker(n)"
                      [disabled]="updating().has(n)">
                {{ n }}
              </button>
            }
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    /* ── Shell ───────────────────────────────────── */
    .app-shell {
      min-height: 100vh;
      background: #f0f4f8;
    }

    /* ── Top bar ─────────────────────────────────── */
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #1a237e;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 16px;
      height: 60px;
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }
    .back-btn { color: rgba(255,255,255,.85) !important; flex-shrink: 0; }
    .back-btn:hover { color: #fff !important; background: rgba(255,255,255,.12) !important; }
    .top-bar-title { flex: 1; min-width: 0; }
    .album-name {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    .album-sub { font-size: 12px; color: rgba(255,255,255,.6); }
    .swaps-btn {
      flex-shrink: 0;
      color: rgba(255,255,255,.9) !important;
      border-color: rgba(255,255,255,.35) !important;
      border-radius: 20px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .swaps-btn:hover { border-color: rgba(255,255,255,.7) !important; }
    .swaps-label { display: none; }
    @media (min-width: 480px) { .swaps-label { display: inline; } }

    .pdf-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 12px;
      height: 36px;
      border-radius: 20px;
      border: 1.5px solid rgba(255,255,255,.35);
      background: transparent;
      color: rgba(255,255,255,.9);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: border-color .15s, background .15s;
    }
    .pdf-btn:hover { border-color: rgba(255,255,255,.7); background: rgba(255,255,255,.1); }
    .pdf-btn mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .pdf-btn--missing { border-color: rgba(255,152,0,.6); color: #ffcc80; }
    .pdf-btn--missing:hover { border-color: #ffa726; background: rgba(255,152,0,.15); }
    .pdf-btn--whatsapp { border-color: rgba(37,211,102,.6); color: #b9f6ca; }
    .pdf-btn--whatsapp:hover { border-color: #25d366; background: rgba(37,211,102,.15); }
    .pdf-label { display: none; }
    @media (min-width: 600px) { .pdf-label { display: inline; } }

    /* ── Stats strip ─────────────────────────────── */
    .stats-strip {
      background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
    }
    .stats-inner {
      max-width: 1400px;
      margin: 0 auto;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 0;
    }
    .stat-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }
    .stat-num {
      font-size: 22px;
      font-weight: 800;
      line-height: 1;
    }
    .stat-lbl {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #90a4ae;
    }
    .have-card .stat-num    { color: #2e7d32; }
    .missing-card .stat-num { color: #546e7a; }
    .dup-card .stat-num     { color: #e65100; }
    .pct-card .stat-num     { color: #1565c0; }
    .stat-divider { width: 1px; height: 40px; background: #eceff1; margin: 0 8px; flex-shrink: 0; }
    .main-progress {
      height: 5px !important;
      border-radius: 0;
    }

    /* ── Controls ────────────────────────────────── */
    .controls-wrap {
      background: #fff;
      border-bottom: 1px solid #eceff1;
      position: sticky;
      top: 60px;
      z-index: 90;
    }
    .controls-inner {
      max-width: 1400px;
      margin: 0 auto;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
    .filter-chip {
      padding: 5px 14px;
      border-radius: 20px;
      border: 1.5px solid #cfd8dc;
      background: transparent;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      color: #607d8b;
      transition: all .15s;
      white-space: nowrap;
    }
    .filter-chip:hover { border-color: #90a4ae; background: #eceff1; }
    .filter-chip.active.chip-all     { background: #1565c0; border-color: #1565c0; color: #fff; }
    .filter-chip.active.chip-have    { background: #2e7d32; border-color: #2e7d32; color: #fff; }
    .filter-chip.active.chip-missing { background: #546e7a; border-color: #546e7a; color: #fff; }
    .filter-chip.active.chip-dup     { background: #e65100; border-color: #e65100; color: #fff; }

    .controls-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .section-select { width: 200px; }
    ::ng-deep .section-select .mat-mdc-text-field-wrapper { padding: 0 12px !important; }
    .mark-all-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      border: 1.5px solid #cfd8dc;
      background: transparent;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      color: #546e7a;
      white-space: nowrap;
      transition: all .15s;
    }
    .mark-all-btn:hover:not(:disabled) { border-color: #1565c0; color: #1565c0; background: #e3f2fd; }
    .mark-all-btn:disabled { opacity: .5; cursor: not-allowed; }
    .mark-all-btn mat-icon { font-size: 18px; height: 18px; width: 18px; }

    /* ── Grid content ────────────────────────────── */
    .grid-content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px 16px 48px;
    }

    /* ── Group header ────────────────────────────── */
    .group-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 28px 0 12px;
    }
    .group-header:first-child { margin-top: 0; }
    .group-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .12em;
      color: #fff;
      background: #1a237e;
      padding: 3px 12px;
      border-radius: 20px;
      white-space: nowrap;
    }
    .group-header::after {
      content: '';
      flex: 1;
      height: 2px;
      background: #1a237e;
      opacity: .15;
      border-radius: 1px;
    }

    /* ── Sections ────────────────────────────────── */
    .section-block { margin-bottom: 28px; }
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e8edf2;
    }
    .section-flag { font-size: 20px; line-height: 1; flex-shrink: 0; }
    .section-name {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: #1a237e;
    }
    .section-badge {
      font-size: 12px;
      color: #90a4ae;
      font-weight: 500;
    }

    /* ── Grids ───────────────────────────────────── */
    .sticker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
      gap: 5px;
    }
    .template-grid {
      grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
    }

    /* ── Sticker cell ────────────────────────────── */
    .sticker-cell {
      width: 100%;
      aspect-ratio: 1;
      border: 2px solid #cfd8dc;
      border-radius: 10px;
      background: #fff;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: transform .12s, box-shadow .12s;
      color: #b0bec5;
      padding: 2px;
      line-height: 1.1;
      word-break: break-all;
    }
    .sticker-cell:hover:not(:disabled) {
      transform: scale(1.1);
      z-index: 1;
      box-shadow: 0 4px 12px rgba(0,0,0,.16);
    }
    .sticker-cell:disabled { opacity: .45; cursor: wait; }
    .sticker-cell.have {
      background: #e8f5e9;
      border-color: #66bb6a;
      color: #2e7d32;
      box-shadow: 0 0 0 1px rgba(76,175,80,.15);
    }
    .sticker-cell.duplicate {
      background: #fff3e0;
      border-color: #ffa726;
      color: #e65100;
      box-shadow: 0 0 0 1px rgba(255,152,0,.15);
    }
    .sticker-cell.missing {
      background: #fff;
      border-color: #cfd8dc;
      color: #b0bec5;
    }

    /* ── Misc ────────────────────────────────────── */
    .centered { display: flex; justify-content: center; padding: 80px; }
    .empty-filter {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 56px;
      color: #90a4ae;
      text-align: center;
    }
    .empty-filter-icon { font-size: 48px; }
  `],
})
export class StickerGridComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private albumService = inject(AlbumService);
  private reportService = inject(ReportService);
  private snackBar = inject(MatSnackBar);

  albumId = signal(0);
  album = signal<Album | null>(null);
  stats = signal<AlbumStats | null>(null);
  loading = signal(true);
  updating = signal<Set<number>>(new Set());
  markingAll = signal(false);
  activeFilter = signal<'all' | StickerStatus>('all');
  activeSectionName = '';

  stickerMap = signal<Map<number, StickerStatus>>(new Map());
  sections = signal<SectionGroup[]>([]);

  private allNumbers = computed(() =>
    Array.from({ length: this.album()?.total_stickers ?? 0 }, (_, i) => i + 1)
  );

  filters = [
    { label: 'Todas',     value: 'all'       as const },
    { label: 'Tengo',     value: 'have'      as const },
    { label: 'Faltan',    value: 'missing'   as const },
    { label: 'Repetidas', value: 'duplicate' as const },
  ];

  ngOnInit(): void {
    this.albumId.set(Number(this.route.snapshot.paramMap.get('id')));
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    const id = this.albumId();

    forkJoin({
      albums:   this.albumService.getAlbums(),
      stickers: this.albumService.getStickers(id),
      stats:    this.albumService.getStats(id),
    }).subscribe(({ albums, stickers, stats }) => {
      const album = albums.find(a => a.id === id) ?? null;
      this.album.set(album);
      this.stats.set(stats);

      const map = new Map<number, StickerStatus>();
      stickers.forEach(s => map.set(s.number, s.status));
      this.stickerMap.set(map);

      if (album?.template_id) {
        this.albumService.getTemplate(album.template_id).subscribe({
          next: (tmpl) => {
            const groups = tmpl.sections.map(sec => ({
              name: sec.name,
              group: sec.group ?? '',
              code_prefix: sec.code_prefix,
              cells: sec.stickers.map(st => ({
                number: st.position,
                display: st.code,
              })),
            }));
            this.sections.set(groups);
            this.loading.set(false);
          },
          error: () => {
            this.buildSectionsFromStickers(stickers);
            this.loading.set(false);
          },
        });
      } else {
        this.sections.set([]);
        this.loading.set(false);
      }
    });
  }

  private buildSectionsFromStickers(stickers: Sticker[]): void {
    const map = new Map<string, StickerCell[]>();
    for (const s of stickers) {
      const prefix = s.code ? s.code.split('-')[0] : '__';
      if (!map.has(prefix)) map.set(prefix, []);
      map.get(prefix)!.push({ number: s.number, display: s.code ?? String(s.number) });
    }
    this.sections.set([...map.entries()].map(([name, cells]) => ({ name, group: '', code_prefix: name, cells })));
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  visibleSections(): SectionGroup[] {
    const name = this.activeSectionName;
    return name ? this.sections().filter(s => s.name === name) : this.sections();
  }

  groupedSections(): GroupBlock[] {
    const result: GroupBlock[] = [];
    const seen = new Map<string, GroupBlock>();
    for (const s of this.visibleSections()) {
      const g = s.group || '';
      if (!seen.has(g)) {
        const block: GroupBlock = { group: g, sections: [] };
        seen.set(g, block);
        result.push(block);
      }
      seen.get(g)!.sections.push(s);
    }
    return result;
  }

  visibleCells(cells: StickerCell[]): StickerCell[] {
    const filter = this.activeFilter();
    if (filter === 'all') return cells;
    return cells.filter(c => this.cellStatus(c.number) === filter);
  }

  visiblePlain(): number[] {
    const filter = this.activeFilter();
    if (filter === 'all') return this.allNumbers();
    return this.allNumbers().filter(n => this.cellStatus(n) === filter);
  }

  allVisibleEmpty(): boolean {
    return this.visibleSections().every(s => this.visibleCells(s.cells).length === 0);
  }

  onSectionChange(): void {
    // scroll to top when switching section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Helpers de sección ────────────────────────────────────────────────────

  flag(section: SectionGroup): string {
    return FLAGS[section.code_prefix] ?? '';
  }

  sectionCount(section: SectionGroup): string {
    const have = section.cells.filter(c => this.cellStatus(c.number) === 'have').length;
    return `${have}/${section.cells.length}`;
  }

  sectionStatusSummary(section: SectionGroup): string {
    const have = section.cells.filter(c => this.cellStatus(c.number) === 'have').length;
    const dup  = section.cells.filter(c => this.cellStatus(c.number) === 'duplicate').length;
    const total = section.cells.length;
    return `${have}/${total} tengo${dup ? ' · ' + dup + ' rep.' : ''}`;
  }

  // ── Stickers ──────────────────────────────────────────────────────────────

  cellStatus(n: number): StickerStatus | 'missing' {
    return this.stickerMap().get(n) ?? 'missing';
  }

  statusLabel(s: string): string {
    return ({ missing: 'Falta', have: 'La tengo', duplicate: 'Repetida' } as Record<string, string>)[s] ?? '';
  }

  cellTooltip(cell: StickerCell): string {
    return `${cell.display} — ${this.statusLabel(this.cellStatus(cell.number))}`;
  }

  cycleSticker(n: number): void {
    const current = this.cellStatus(n);
    const next: Record<string, StickerStatus> = { missing: 'have', have: 'duplicate', duplicate: 'missing' };
    const newStatus = next[current];

    this.updating.update(s => new Set(s).add(n));
    this.albumService.updateSticker(this.albumId(), n, newStatus).subscribe({
      next: (updated) => {
        this.stickerMap.update(m => { const nm = new Map(m); nm.set(n, updated.status); return nm; });
        this.updating.update(s => { const ns = new Set(s); ns.delete(n); return ns; });
        this.albumService.getStats(this.albumId()).subscribe(s => this.stats.set(s));
      },
      error: () => this.updating.update(s => { const ns = new Set(s); ns.delete(n); return ns; }),
    });
  }

  markAllVisible(): void {
    const numbers = this.getVisibleNumbers().filter(n => this.cellStatus(n) !== 'have');
    if (numbers.length === 0) return;
    this.markingAll.set(true);
    const payload = numbers.map(n => ({ number: n, status: 'have' as StickerStatus }));
    this.albumService.bulkUpdate(this.albumId(), payload).subscribe({
      next: (updated) => {
        this.stickerMap.update(m => {
          const nm = new Map(m);
          updated.forEach(s => nm.set(s.number, s.status));
          return nm;
        });
        this.markingAll.set(false);
        this.albumService.getStats(this.albumId()).subscribe(s => this.stats.set(s));
      },
      error: () => this.markingAll.set(false),
    });
  }

  private getVisibleNumbers(): number[] {
    if (this.sections().length > 0) {
      return this.visibleSections().flatMap(s => this.visibleCells(s.cells).map(c => c.number));
    }
    return this.visiblePlain();
  }

  setFilter(f: 'all' | StickerStatus): void {
    this.activeFilter.set(f);
  }

  downloadComplete(): void {
    const album = this.album();
    const stats = this.stats();
    if (!album || !stats) return;
    this.reportService.downloadCompleteReport(album, stats, this.sections(), this.stickerMap());
  }

  downloadMissing(): void {
    const album = this.album();
    const stats = this.stats();
    if (!album || !stats) return;
    this.reportService.downloadMissingReport(album, stats, this.sections(), this.stickerMap());
  }

  private buildShareMessage(type: 'duplicate' | 'missing'): string | null {
    const album = this.album();
    if (!album) return null;

    const targetStatus = type === 'duplicate' ? 'duplicate' : 'missing';
    const label = type === 'duplicate' ? 'repetidas' : 'faltantes';
    const headerEmoji = type === 'duplicate' ? '🔄' : '❓';

    let totalCount = 0;
    let sectionsWithMatches = 0;
    const bodyLines: string[] = [];

    if (this.sections().length > 0) {
      for (const section of this.sections()) {
        const matching = section.cells
          .filter(c => this.cellStatus(c.number) === targetStatus)
          .map(c => c.display);
        if (matching.length === 0) continue;

        const flagEmoji = this.flag(section);
        const prefix = flagEmoji ? `${flagEmoji} ` : '';
        bodyLines.push(`${prefix}*${section.name}* (${matching.length}): ${matching.join(', ')}`);
        totalCount += matching.length;
        sectionsWithMatches++;
      }
    } else {
      const nums = this.allNumbers().filter(n => this.cellStatus(n) === targetStatus);
      totalCount = nums.length;
      bodyLines.push(nums.join(', '));
    }

    if (totalCount === 0) {
      this.snackBar.open(`No tienes láminas ${label} 🎉`, '', { duration: 2500 });
      return null;
    }

    const summary = sectionsWithMatches > 0
      ? `${totalCount} láminas · ${sectionsWithMatches} países`
      : `${totalCount} láminas`;

    return [
      `${headerEmoji} *Láminas ${label}*`,
      `📒 ${album.name}`,
      `_(${summary})_`,
      '',
      ...bodyLines,
    ].join('\n');
  }

  shareWhatsApp(type: 'duplicate' | 'missing'): void {
    const message = this.buildShareMessage(type);
    if (!message) return;
    // whatsapp:// abre la app directamente sin redirección web,
    // lo que preserva los emojis de banderas en el texto.
    const waUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    const link = document.createElement('a');
    link.href = waUrl;
    link.click();
  }

  async copyToClipboard(type: 'duplicate' | 'missing'): Promise<void> {
    const message = this.buildShareMessage(type);
    if (!message) return;
    await navigator.clipboard.writeText(message);
    this.snackBar.open('Texto copiado al portapapeles ✓', '', { duration: 2500 });
  }

  back(): void {
    this.router.navigate(['/albums']);
  }
}
