import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  AlbumService, SwapMatch, StickerHolder, MissingStickerMatch, SwapRequest,
} from '../../core/services/album.service';

@Component({
  selector: 'app-swap-matches',
  standalone: true,
  imports: [
    FormsModule, RouterLink,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatExpansionModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="app-shell">

      <!-- ── Top bar ─────────────────────────────────── -->
      <header class="top-bar">
        <button mat-icon-button class="back-btn" (click)="back()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="top-bar-title">Intercambios</h1>
        <span class="spacer"></span>
        <a class="requests-btn" [routerLink]="['/swap-requests']">
          <mat-icon>inbox</mat-icon>
          <span>Solicitudes</span>
          @if (pendingCount()) {
            <span class="inbox-badge">{{ pendingCount() }}</span>
          }
        </a>
      </header>

      <!-- ── Tabs ─────────────────────────────────────── -->
      <div class="tabs-bar">
        <button class="tab-btn" [class.tab-active]="activeTab === 'swaps'" (click)="activeTab = 'swaps'">
          <mat-icon>swap_horiz</mat-icon> Mis intercambios
        </button>
        <button class="tab-btn" [class.tab-active]="activeTab === 'search'" (click)="activeTab = 'search'">
          <mat-icon>search</mat-icon> Buscar lámina
        </button>
      </div>

      <div class="page-body">

        <!-- ════ TAB: Mis intercambios ════ -->
        @if (activeTab === 'swaps') {
          @if (loadingSwaps()) {
            <div class="centered"><mat-spinner diameter="48"></mat-spinner></div>
          } @else if (swaps().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">🤝</span>
              <h2 class="empty-title">Sin intercambios posibles</h2>
              <p class="empty-sub">Más amigos necesitan registrar sus láminas.</p>
            </div>
          } @else {
            <div class="swaps-list">
              @for (swap of swaps(); track swap.friend_id) {
                <div class="swap-card">
                  <!-- Friend header -->
                  <div class="swap-header">
                    <div class="avatar">{{ avatarLetter(swap.friend_full_name || swap.friend_username) }}</div>
                    <div class="swap-info">
                      <div class="swap-name">{{ swap.friend_full_name || swap.friend_username }}</div>
                      @if (swap.friend_full_name) {
                        <div class="swap-username">&#64;{{ swap.friend_username }}</div>
                      }
                    </div>
                    <div class="swap-total">
                      <span class="total-num">{{ swap.total_possible }}</span>
                      <span class="total-lbl">posibles</span>
                    </div>
                  </div>

                  <!-- Sticker lanes -->
                  <div class="swap-lanes">
                    @if (swap.can_give.length > 0) {
                      <div class="swap-lane give-lane">
                        <span class="lane-label">
                          <mat-icon class="lane-icon">arrow_upward</mat-icon> Puedo darle
                        </span>
                        <div class="chip-row">
                          @for (c of swap.can_give; track c) {
                            <span class="s-chip give-chip">{{ c }}</span>
                          }
                        </div>
                      </div>
                    }
                    @if (swap.can_receive.length > 0) {
                      <div class="swap-lane receive-lane">
                        <span class="lane-label">
                          <mat-icon class="lane-icon">arrow_downward</mat-icon> Puede darme
                        </span>
                        <div class="chip-row">
                          @for (c of swap.can_receive; track c) {
                            <span class="s-chip receive-chip">{{ c }}</span>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Action -->
                  <div class="swap-action">
                    @switch (requestStatus(swap.friend_id)) {
                      @case ('accepted') {
                        @if (swap.friend_phone) {
                          <a class="action-btn whatsapp-btn"
                             [href]="whatsappSwapLink(swap)"
                             target="_blank" rel="noopener">
                            <mat-icon>chat</mat-icon> WhatsApp
                          </a>
                        } @else {
                          <span class="status-pill accepted-pill"><mat-icon>check_circle</mat-icon> Contacto aceptado</span>
                        }
                      }
                      @case ('pending_sent') {
                        <span class="status-pill pending-pill"><mat-icon>schedule</mat-icon> Solicitud enviada</span>
                      }
                      @case ('pending_received') {
                        <a class="action-btn notify-btn" [routerLink]="['/swap-requests']">
                          <mat-icon>notifications_active</mat-icon> Ver solicitud recibida
                        </a>
                      }
                      @default {
                        <button class="action-btn request-btn"
                                (click)="openRequestDialog(swap.friend_id, swap.friend_full_name || swap.friend_username)">
                          <mat-icon>handshake</mat-icon> Solicitar intercambio
                        </button>
                      }
                    }
                  </div>
                </div>
              }
            </div>
          }
        }

        <!-- ════ TAB: Buscar lámina ════ -->
        @if (activeTab === 'search') {
          <div class="search-section">

            <!-- Search card -->
            <div class="search-card">
              <h3 class="search-card-title">Buscar por código</h3>
              <p class="search-hint">Ingresa el código de la lámina (ej. <strong>ARG-1</strong>) para ver quién la tiene repetida.</p>
              <div class="search-row">
                <mat-form-field appearance="outline" class="search-field">
                  <mat-label>Código de lámina</mat-label>
                  <input matInput [(ngModel)]="searchCode"
                         (ngModelChange)="searchCode = $event?.toUpperCase() ?? ''"
                         (keyup.enter)="searchHolders()"
                         placeholder="Ej. ARG-1">
                  <mat-icon matSuffix>search</mat-icon>
                </mat-form-field>
                <button class="search-btn"
                        (click)="searchHolders()"
                        [disabled]="!searchCode.trim() || loadingSearch()">
                  Buscar
                </button>
              </div>

              @if (loadingSearch()) {
                <div class="centered"><mat-spinner diameter="36"></mat-spinner></div>
              } @else if (searchDone()) {
                @if (holders().length === 0) {
                  <div class="inline-empty">
                    <span>😕</span>
                    <span>Nadie tiene <strong>{{ lastSearchedCode() }}</strong> repetida.</span>
                  </div>
                } @else {
                  <p class="results-label">{{ holders().length }} persona(s) con <strong>{{ lastSearchedCode() }}</strong> repetida:</p>
                  @for (h of holders(); track h.user_id) {
                    <div class="holder-row">
                      <div class="holder-info">
                        <div class="avatar sm-avatar">{{ avatarLetter(h.full_name || h.username) }}</div>
                        <div>
                          <div class="holder-name">{{ h.full_name || h.username }}</div>
                          @if (h.full_name) { <div class="holder-uname">&#64;{{ h.username }}</div> }
                        </div>
                      </div>
                      <div class="holder-action">
                        @switch (requestStatus(h.user_id)) {
                          @case ('accepted') {
                            @if (h.phone) {
                              <a class="action-btn whatsapp-btn sm-btn"
                                 [href]="whatsappHolderLink(h.phone, lastSearchedCode())"
                                 target="_blank" rel="noopener">
                                <mat-icon>chat</mat-icon> WhatsApp
                              </a>
                            } @else {
                              <span class="status-pill accepted-pill"><mat-icon>check_circle</mat-icon> Aceptado</span>
                            }
                          }
                          @case ('pending_sent') {
                            <span class="status-pill pending-pill"><mat-icon>schedule</mat-icon> Enviada</span>
                          }
                          @case ('pending_received') {
                            <a class="action-btn notify-btn sm-btn" [routerLink]="['/swap-requests']">
                              <mat-icon>notifications</mat-icon> Ver
                            </a>
                          }
                          @default {
                            <button class="action-btn request-btn sm-btn"
                                    (click)="openRequestDialog(h.user_id, h.full_name || h.username)">
                              <mat-icon>handshake</mat-icon> Solicitar
                            </button>
                          }
                        }
                      </div>
                    </div>
                  }
                }
              }
            </div>

            <!-- Missing holders card -->
            <div class="search-card">
              <div class="missing-header">
                <div>
                  <h3 class="search-card-title">Mis faltantes disponibles</h3>
                  <p class="search-hint" style="margin:0">Láminas que te faltan y que alguien tiene repetidas.</p>
                </div>
                <button class="action-btn request-btn sm-btn"
                        (click)="loadMissingHolders()" [disabled]="loadingMissing()">
                  <mat-icon>{{ missingLoaded() ? 'refresh' : 'manage_search' }}</mat-icon>
                  {{ missingLoaded() ? 'Actualizar' : 'Ver faltantes' }}
                </button>
              </div>

              @if (loadingMissing()) {
                <div class="centered"><mat-spinner diameter="40"></mat-spinner></div>
              } @else if (missingLoaded()) {
                @if (missingMatches().length === 0) {
                  <div class="inline-empty">
                    <span>✅</span>
                    <span>Nadie tiene repetidas las láminas que te faltan aún.</span>
                  </div>
                } @else {
                  <p class="results-label"><strong>{{ missingMatches().length }}</strong> láminas faltantes disponibles:</p>
                  <mat-accordion>
                    @for (match of missingMatches(); track match.sticker_code) {
                      <mat-expansion-panel class="missing-panel">
                        <mat-expansion-panel-header>
                          <mat-panel-title>
                            <span class="s-chip receive-chip" style="margin-right:10px">{{ match.sticker_code }}</span>
                            {{ match.holders.length }} persona(s)
                          </mat-panel-title>
                        </mat-expansion-panel-header>
                        <div class="holders-list">
                          @for (h of match.holders; track h.user_id) {
                            <div class="holder-row">
                              <div class="holder-info">
                                <div class="avatar sm-avatar">{{ avatarLetter(h.full_name || h.username) }}</div>
                                <div>
                                  <div class="holder-name">{{ h.full_name || h.username }}</div>
                                  @if (h.full_name) { <div class="holder-uname">&#64;{{ h.username }}</div> }
                                </div>
                              </div>
                              <div class="holder-action">
                                @switch (requestStatus(h.user_id)) {
                                  @case ('accepted') {
                                    @if (h.phone) {
                                      <a class="action-btn whatsapp-btn sm-btn"
                                         [href]="whatsappHolderLink(h.phone, match.sticker_code)"
                                         target="_blank" rel="noopener">
                                        <mat-icon>chat</mat-icon> WhatsApp
                                      </a>
                                    } @else {
                                      <span class="status-pill accepted-pill"><mat-icon>check_circle</mat-icon> Aceptado</span>
                                    }
                                  }
                                  @case ('pending_sent') {
                                    <span class="status-pill pending-pill"><mat-icon>schedule</mat-icon> Enviada</span>
                                  }
                                  @case ('pending_received') {
                                    <a class="action-btn notify-btn sm-btn" [routerLink]="['/swap-requests']">
                                      <mat-icon>notifications</mat-icon> Ver
                                    </a>
                                  }
                                  @default {
                                    <button class="action-btn request-btn sm-btn"
                                            (click)="openRequestDialog(h.user_id, h.full_name || h.username)">
                                      <mat-icon>handshake</mat-icon> Solicitar
                                    </button>
                                  }
                                }
                              </div>
                            </div>
                          }
                        </div>
                      </mat-expansion-panel>
                    }
                  </mat-accordion>
                }
              }
            </div>

          </div>
        }

      </div>
    </div>

    <!-- ── Dialog solicitud ─────────────────────── -->
    @if (showDialog()) {
      <div class="dialog-backdrop" (click)="closeDialog()">
        <div class="dialog-box" (click)="$event.stopPropagation()">
          <h2 class="dialog-title">Solicitar intercambio</h2>
          <p class="dialog-to">Para: <strong>{{ dialogTargetName() }}</strong></p>
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Mensaje (opcional)</mat-label>
            <textarea matInput [(ngModel)]="dialogMessage" rows="3"
                      placeholder="Hola, vi que tenemos láminas para intercambiar..."></textarea>
          </mat-form-field>
          <div class="dialog-actions">
            <button class="dialog-cancel" (click)="closeDialog()">Cancelar</button>
            <button class="action-btn request-btn"
                    (click)="sendRequest()" [disabled]="sendingRequest()">
              @if (sendingRequest()) { <mat-spinner diameter="18"></mat-spinner> }
              @else { <mat-icon>send</mat-icon> Enviar solicitud }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* ── Shell ───────────────────────────────────── */
    .app-shell { min-height: 100vh; background: #f0f4f8; }

    /* ── Top bar ─────────────────────────────────── */
    .top-bar {
      position: sticky; top: 0; z-index: 100;
      background: #1a237e;
      display: flex; align-items: center; gap: 12px;
      padding: 0 16px; height: 60px;
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }
    .back-btn { color: rgba(255,255,255,.85) !important; }
    .back-btn:hover { color: #fff !important; background: rgba(255,255,255,.12) !important; }
    .top-bar-title { margin: 0; font-size: 18px; font-weight: 700; color: #fff; }
    .spacer { flex: 1; }
    .requests-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 20px;
      border: 1.5px solid rgba(255,255,255,.35);
      color: rgba(255,255,255,.9);
      font-size: 13px; font-weight: 600;
      text-decoration: none; cursor: pointer;
      position: relative;
      transition: border-color .15s;
    }
    .requests-btn:hover { border-color: rgba(255,255,255,.7); }
    .requests-btn mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .inbox-badge {
      position: absolute; top: -6px; right: -6px;
      background: #f44336; color: #fff;
      font-size: 10px; font-weight: 700;
      border-radius: 10px; padding: 1px 5px; min-width: 16px;
      text-align: center;
    }

    /* ── Tabs ────────────────────────────────────── */
    .tabs-bar {
      background: #fff;
      display: flex;
      border-bottom: 2px solid #eceff1;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }
    .tab-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 14px 20px;
      border: none; background: transparent;
      font-size: 14px; font-weight: 600;
      color: #90a4ae; cursor: pointer;
      border-bottom: 3px solid transparent;
      margin-bottom: -2px;
      transition: color .15s, border-color .15s;
    }
    .tab-btn mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .tab-btn:hover { color: #546e7a; }
    .tab-btn.tab-active { color: #1565c0; border-bottom-color: #1565c0; }

    /* ── Page body ───────────────────────────────── */
    .page-body { max-width: 860px; margin: 0 auto; padding: 24px 16px 48px; }

    /* ── Swap list ───────────────────────────────── */
    .swaps-list { display: flex; flex-direction: column; gap: 16px; }

    /* ── Swap card ───────────────────────────────── */
    .swap-card {
      background: #fff; border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,.07);
      overflow: hidden;
    }
    .swap-header {
      display: flex; align-items: center; gap: 14px;
      padding: 16px 20px 12px;
      border-bottom: 1px solid #f0f4f8;
    }
    .avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, #1565c0, #42a5f5);
      color: #fff; font-size: 18px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; text-transform: uppercase;
    }
    .swap-info { flex: 1; min-width: 0; }
    .swap-name { font-size: 15px; font-weight: 700; color: #1a237e; }
    .swap-username { font-size: 12px; color: #90a4ae; }
    .swap-total { text-align: center; flex-shrink: 0; }
    .total-num { display: block; font-size: 22px; font-weight: 800; color: #1565c0; line-height: 1; }
    .total-lbl { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #90a4ae; letter-spacing: .06em; }

    .swap-lanes { padding: 12px 20px; display: flex; flex-direction: column; gap: 10px; }
    .swap-lane { display: flex; flex-direction: column; gap: 6px; }
    .lane-label {
      display: flex; align-items: center; gap: 4px;
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .06em;
    }
    .lane-icon { font-size: 14px; height: 14px; width: 14px; }
    .give-lane .lane-label { color: #e65100; }
    .receive-lane .lane-label { color: #2e7d32; }
    .chip-row { display: flex; flex-wrap: wrap; gap: 4px; }
    .s-chip {
      padding: 3px 9px; border-radius: 12px;
      font-size: 12px; font-weight: 700; display: inline-block;
    }
    .give-chip    { background: #fff3e0; color: #e65100; border: 1.5px solid #ffa726; }
    .receive-chip { background: #e8f5e9; color: #2e7d32; border: 1.5px solid #66bb6a; }

    .swap-action {
      padding: 12px 20px;
      display: flex; justify-content: flex-end;
      border-top: 1px solid #f0f4f8;
    }

    /* ── Action buttons ──────────────────────────── */
    .action-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 18px; border-radius: 20px;
      font-size: 13px; font-weight: 600;
      cursor: pointer; border: none; text-decoration: none;
      transition: opacity .15s, transform .12s;
    }
    .action-btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
    .action-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
    .action-btn mat-icon { font-size: 16px; height: 16px; width: 16px; }
    .request-btn { background: #1565c0; color: #fff; }
    .whatsapp-btn { background: #25d366; color: #fff; }
    .notify-btn  { background: #7c4dff; color: #fff; }
    .sm-btn { padding: 6px 14px; font-size: 12px; }

    /* ── Status pills ────────────────────────────── */
    .status-pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 600;
    }
    .status-pill mat-icon { font-size: 15px; height: 15px; width: 15px; }
    .accepted-pill { background: #e8f5e9; color: #2e7d32; }
    .pending-pill  { background: #fff3e0; color: #e65100; }

    /* ── Search section ──────────────────────────── */
    .search-section { display: flex; flex-direction: column; gap: 20px; }
    .search-card {
      background: #fff; border-radius: 20px;
      padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,.07);
    }
    .search-card-title { margin: 0 0 6px; font-size: 17px; font-weight: 700; color: #1a237e; }
    .search-hint { font-size: 14px; color: #607d8b; margin: 0 0 16px; }
    .search-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 180px; }
    .search-btn {
      display: inline-flex; align-items: center;
      padding: 10px 22px; border-radius: 20px;
      background: #1565c0; color: #fff;
      border: none; font-size: 14px; font-weight: 600;
      cursor: pointer; white-space: nowrap;
    }
    .search-btn:disabled { opacity: .5; cursor: not-allowed; }
    .inline-empty {
      display: flex; align-items: center; gap: 8px;
      color: #90a4ae; margin-top: 12px; font-size: 14px;
    }
    .results-label { margin: 12px 0 8px; font-size: 14px; color: #546e7a; }
    .missing-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .missing-panel { border-radius: 12px !important; margin-bottom: 6px; }

    /* ── Holder row ──────────────────────────────── */
    .holders-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
    .holder-row {
      display: flex; align-items: center;
      justify-content: space-between; gap: 12px;
      padding: 8px 4px;
      border-bottom: 1px solid #f0f4f8;
    }
    .holder-row:last-child { border-bottom: none; }
    .holder-info { display: flex; align-items: center; gap: 10px; }
    .sm-avatar { width: 34px; height: 34px; font-size: 14px; }
    .holder-name { font-size: 14px; font-weight: 600; color: #37474f; }
    .holder-uname { font-size: 12px; color: #90a4ae; }
    .holder-action { flex-shrink: 0; }

    /* ── Dialog ──────────────────────────────────── */
    .dialog-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.45);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .dialog-box {
      background: #fff; border-radius: 20px; padding: 28px;
      width: min(480px, 92vw);
      display: flex; flex-direction: column; gap: 14px;
      box-shadow: 0 12px 48px rgba(0,0,0,.22);
    }
    .dialog-title { margin: 0; font-size: 20px; font-weight: 700; color: #1a237e; }
    .dialog-to { margin: 0; color: #607d8b; font-size: 14px; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
    .dialog-cancel {
      background: transparent; border: 1.5px solid #cfd8dc;
      border-radius: 20px; padding: 8px 18px;
      font-size: 13px; font-weight: 600; color: #607d8b;
      cursor: pointer;
    }

    /* ── Shared ──────────────────────────────────── */
    .centered { display: flex; justify-content: center; padding: 48px; }
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 64px 24px; text-align: center;
    }
    .empty-icon { font-size: 64px; }
    .empty-title { margin: 0; font-size: 22px; font-weight: 700; color: #37474f; }
    .empty-sub { margin: 0; color: #90a4ae; font-size: 15px; }
  `],
})
export class SwapMatchesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private albumService = inject(AlbumService);
  private snack = inject(MatSnackBar);

  private albumId = 0;
  activeTab: 'swaps' | 'search' = 'swaps';

  swaps = signal<SwapMatch[]>([]);
  loadingSwaps = signal(true);
  pendingCount = signal(0);

  // Map: userId → 'accepted' | 'pending_sent' | 'pending_received' | null
  private requestMap = signal<Map<number, string>>(new Map());

  searchCode = '';
  holders = signal<StickerHolder[]>([]);
  loadingSearch = signal(false);
  searchDone = signal(false);
  lastSearchedCode = signal('');

  missingMatches = signal<MissingStickerMatch[]>([]);
  loadingMissing = signal(false);
  missingLoaded = signal(false);

  showDialog = signal(false);
  dialogTargetId = signal(0);
  dialogTargetName = signal('');
  dialogMessage = '';
  sendingRequest = signal(false);

  ngOnInit(): void {
    this.albumId = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      swaps: this.albumService.getSwapMatches(this.albumId),
      sent: this.albumService.getSentRequests(),
      received: this.albumService.getReceivedRequests(),
    }).subscribe({
      next: ({ swaps, sent, received }) => {
        this.swaps.set(swaps);
        this.loadingSwaps.set(false);
        this._buildRequestMap(sent, received);
        const pending = received.filter(r => r.status === 'pending').length;
        this.pendingCount.set(pending);
      },
      error: () => this.loadingSwaps.set(false),
    });
  }

  private _buildRequestMap(sent: SwapRequest[], received: SwapRequest[]): void {
    const map = new Map<number, string>();
    for (const r of sent) {
      if (r.status === 'accepted') map.set(r.receiver.id, 'accepted');
      else if (r.status === 'pending') map.set(r.receiver.id, 'pending_sent');
    }
    for (const r of received) {
      if (r.status === 'accepted') map.set(r.requester.id, 'accepted');
      else if (r.status === 'pending' && !map.has(r.requester.id)) map.set(r.requester.id, 'pending_received');
    }
    this.requestMap.set(map);
  }

  requestStatus(userId: number): string {
    return this.requestMap().get(userId) ?? 'none';
  }

  searchHolders(): void {
    const code = this.searchCode.trim();
    if (!code) return;
    this.loadingSearch.set(true);
    this.searchDone.set(false);
    this.lastSearchedCode.set(code.toUpperCase());
    this.albumService.searchStickerHolders(this.albumId, code).subscribe({
      next: (h) => { this.holders.set(h); this.loadingSearch.set(false); this.searchDone.set(true); },
      error: () => { this.loadingSearch.set(false); this.searchDone.set(true); },
    });
  }

  loadMissingHolders(): void {
    this.loadingMissing.set(true);
    this.albumService.getMissingHolders(this.albumId).subscribe({
      next: (m) => { this.missingMatches.set(m); this.loadingMissing.set(false); this.missingLoaded.set(true); },
      error: () => { this.loadingMissing.set(false); this.missingLoaded.set(true); },
    });
  }

  openRequestDialog(userId: number, name: string): void {
    this.dialogTargetId.set(userId);
    this.dialogTargetName.set(name);
    this.dialogMessage = '';
    this.showDialog.set(true);
  }

  closeDialog(): void { this.showDialog.set(false); }

  sendRequest(): void {
    this.sendingRequest.set(true);
    this.albumService.sendSwapRequest(this.dialogTargetId(), this.dialogMessage).subscribe({
      next: (req) => {
        this.sendingRequest.set(false);
        this.showDialog.set(false);
        const map = new Map(this.requestMap());
        map.set(req.receiver.id, 'pending_sent');
        this.requestMap.set(map);
        this.snack.open('Solicitud enviada', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.sendingRequest.set(false);
        const msg = err?.error?.detail ?? 'Error al enviar la solicitud';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  whatsappSwapLink(swap: SwapMatch): string {
    const clean = swap.friend_phone.replace(/\D/g, '');
    const give = swap.can_give.length ? `Tengo repetidas: ${swap.can_give.slice(0, 10).join(', ')}` : '';
    const receive = swap.can_receive.length ? `Me faltan tus repetidas: ${swap.can_receive.slice(0, 10).join(', ')}` : '';
    const sep = give && receive ? '. ' : '';
    const msg = `Hola! Vi en la app Panini que podemos intercambiar láminas. ${give}${sep}${receive}`.trim();
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  }

  whatsappHolderLink(phone: string, code: string): string {
    const clean = phone.replace(/\D/g, '');
    const msg = `Hola! Vi en la app Panini que tienes la lámina ${code} repetida. ¿La cambias?`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  }

  avatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  back(): void { this.router.navigate(['/albums', this.albumId]); }
}
