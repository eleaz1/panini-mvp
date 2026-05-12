import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AlbumService, SwapRequest } from '../../core/services/album.service';

@Component({
  selector: 'app-swap-requests',
  standalone: true,
  imports: [
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  template: `
    <div class="app-shell">

      <!-- ── Top bar ─────────────────────────────────── -->
      <header class="top-bar">
        <button mat-icon-button class="back-btn" (click)="back()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="top-bar-title">Solicitudes</h1>
      </header>

      <!-- ── Tabs ─────────────────────────────────────── -->
      <div class="tabs-bar">
        <button class="tab-btn" [class.tab-active]="activeTab === 'received'" (click)="activeTab = 'received'">
          <mat-icon>inbox</mat-icon>
          Recibidas
          @if (pendingCount() > 0) {
            <span class="tab-badge">{{ pendingCount() }}</span>
          }
        </button>
        <button class="tab-btn" [class.tab-active]="activeTab === 'sent'" (click)="activeTab = 'sent'">
          <mat-icon>send</mat-icon>
          Enviadas
        </button>
      </div>

      @if (loading()) {
        <div class="centered"><mat-spinner diameter="48"></mat-spinner></div>
      } @else {

        <div class="page-body">

          <!-- ════ TAB: Recibidas ════ -->
          @if (activeTab === 'received') {
            @if (received().length === 0) {
              <div class="empty-state">
                <span class="empty-icon">📬</span>
                <h2 class="empty-title">Sin solicitudes recibidas</h2>
                <p class="empty-sub">Cuando alguien te envíe una solicitud de intercambio aparecerá aquí.</p>
              </div>
            } @else {
              <div class="requests-list">
                @for (req of received(); track req.id) {
                  <div class="request-card" [class.card-pending]="req.status === 'pending'">
                    <div class="card-side-bar" [class.bar-pending]="req.status === 'pending'"
                         [class.bar-accepted]="req.status === 'accepted'"
                         [class.bar-declined]="req.status === 'declined'">
                    </div>
                    <div class="card-content">
                      <div class="card-header">
                        <div class="avatar">{{ avatarLetter(req.requester.full_name || req.requester.username) }}</div>
                        <div class="card-meta">
                          <div class="card-name">{{ req.requester.full_name || req.requester.username }}</div>
                          @if (req.requester.full_name) {
                            <div class="card-uname">&#64;{{ req.requester.username }}</div>
                          }
                        </div>
                        <div class="card-right">
                          <span class="status-pill" [class]="'pill-' + req.status">{{ statusLabel(req.status) }}</span>
                          <span class="card-date">{{ formatDate(req.created_at) }}</span>
                        </div>
                      </div>

                      @if (req.message) {
                        <blockquote class="req-message">"{{ req.message }}"</blockquote>
                      }

                      @if (req.status === 'pending') {
                        <div class="card-actions">
                          <button class="action-btn decline-btn"
                                  [disabled]="responding() === req.id"
                                  (click)="respond(req.id, false)">
                            <mat-icon>close</mat-icon> Rechazar
                          </button>
                          <button class="action-btn accept-btn"
                                  [disabled]="responding() === req.id"
                                  (click)="respond(req.id, true)">
                            <mat-icon>check</mat-icon> Aceptar
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          }

          <!-- ════ TAB: Enviadas ════ -->
          @if (activeTab === 'sent') {
            @if (sent().length === 0) {
              <div class="empty-state">
                <span class="empty-icon">📤</span>
                <h2 class="empty-title">Sin solicitudes enviadas</h2>
                <p class="empty-sub">Las solicitudes que envíes a tus amigos aparecerán aquí.</p>
              </div>
            } @else {
              <div class="requests-list">
                @for (req of sent(); track req.id) {
                  <div class="request-card">
                    <div class="card-side-bar" [class.bar-pending]="req.status === 'pending'"
                         [class.bar-accepted]="req.status === 'accepted'"
                         [class.bar-declined]="req.status === 'declined'">
                    </div>
                    <div class="card-content">
                      <div class="card-header">
                        <div class="avatar">{{ avatarLetter(req.receiver.full_name || req.receiver.username) }}</div>
                        <div class="card-meta">
                          <div class="card-name">{{ req.receiver.full_name || req.receiver.username }}</div>
                          @if (req.receiver.full_name) {
                            <div class="card-uname">&#64;{{ req.receiver.username }}</div>
                          }
                        </div>
                        <div class="card-right">
                          <span class="status-pill" [class]="'pill-' + req.status">{{ statusLabel(req.status) }}</span>
                          <span class="card-date">{{ formatDate(req.created_at) }}</span>
                        </div>
                      </div>
                      @if (req.message) {
                        <blockquote class="req-message">"{{ req.message }}"</blockquote>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          }

        </div>
      }
    </div>
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
    .tab-badge {
      background: #f44336; color: #fff;
      border-radius: 10px; font-size: 10px; font-weight: 700;
      padding: 1px 6px; min-width: 16px; text-align: center;
    }

    /* ── Page body ───────────────────────────────── */
    .page-body { max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
    .centered { display: flex; justify-content: center; padding: 80px; }

    /* ── Requests list ───────────────────────────── */
    .requests-list { display: flex; flex-direction: column; gap: 12px; }

    /* ── Request card ────────────────────────────── */
    .request-card {
      background: #fff; border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,.07);
      display: flex; overflow: hidden;
      transition: box-shadow .15s;
    }
    .request-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
    .card-side-bar { width: 5px; flex-shrink: 0; }
    .bar-pending  { background: #1565c0; }
    .bar-accepted { background: #2e7d32; }
    .bar-declined { background: #c62828; }
    .card-content { flex: 1; padding: 16px 20px; }

    .card-header {
      display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap;
    }
    .avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, #1565c0, #42a5f5);
      color: #fff; font-size: 17px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; text-transform: uppercase;
    }
    .card-meta { flex: 1; min-width: 0; }
    .card-name { font-size: 15px; font-weight: 700; color: #1a237e; }
    .card-uname { font-size: 12px; color: #90a4ae; }
    .card-right {
      display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
      flex-shrink: 0;
    }
    .card-date { font-size: 11px; color: #b0bec5; }

    /* ── Status pills ────────────────────────────── */
    .status-pill {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: 12px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .05em;
    }
    .pill-pending  { background: #e3f2fd; color: #1565c0; }
    .pill-accepted { background: #e8f5e9; color: #2e7d32; }
    .pill-declined { background: #fce4ec; color: #c62828; }

    /* ── Message ─────────────────────────────────── */
    .req-message {
      margin: 10px 0 0;
      padding: 10px 14px;
      background: #f8f9fa; border-left: 3px solid #cfd8dc;
      border-radius: 0 8px 8px 0;
      font-style: italic; color: #546e7a; font-size: 14px;
    }

    /* ── Card actions ────────────────────────────── */
    .card-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; }
    .action-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 16px; border-radius: 20px;
      font-size: 13px; font-weight: 600; border: none;
      cursor: pointer; transition: opacity .15s;
    }
    .action-btn:disabled { opacity: .5; cursor: not-allowed; }
    .action-btn mat-icon { font-size: 16px; height: 16px; width: 16px; }
    .accept-btn  { background: #1565c0; color: #fff; }
    .decline-btn { background: #fff; color: #c62828; border: 1.5px solid #ef9a9a; }
    .accept-btn:hover:not(:disabled)  { opacity: .88; }
    .decline-btn:hover:not(:disabled) { background: #fce4ec; }

    /* ── Empty state ─────────────────────────────── */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 12px; padding: 72px 24px; text-align: center;
    }
    .empty-icon { font-size: 64px; }
    .empty-title { margin: 0; font-size: 22px; font-weight: 700; color: #37474f; }
    .empty-sub { margin: 0; color: #90a4ae; font-size: 15px; max-width: 320px; }
  `],
})
export class SwapRequestsComponent implements OnInit {
  private albumService = inject(AlbumService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  activeTab: 'received' | 'sent' = 'received';
  loading = signal(true);
  received = signal<SwapRequest[]>([]);
  sent = signal<SwapRequest[]>([]);
  responding = signal<number | null>(null);

  pendingCount = () => this.received().filter(r => r.status === 'pending').length;

  avatarLetter(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    Promise.all([
      this.albumService.getReceivedRequests().toPromise(),
      this.albumService.getSentRequests().toPromise(),
    ]).then(([recv, snt]) => {
      const sorted = [...(recv ?? [])].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      this.received.set(sorted);
      this.sent.set([...(snt ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }

  respond(requestId: number, accept: boolean): void {
    this.responding.set(requestId);
    this.albumService.respondRequest(requestId, accept ? 'accept' : 'decline').subscribe({
      next: (updated) => {
        this.responding.set(null);
        this.received.update(list =>
          list.map(r => r.id === requestId ? { ...r, status: updated.status } : r)
        );
        this.snack.open(
          accept ? 'Solicitud aceptada — ahora pueden intercambiar datos' : 'Solicitud rechazada',
          'OK', { duration: 4000 }
        );
      },
      error: (err) => {
        this.responding.set(null);
        this.snack.open(err?.error?.detail ?? 'Error al responder', 'OK', { duration: 4000 });
      },
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      declined: 'Rechazada',
    };
    return labels[status] ?? status;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  back(): void { this.router.navigate(['/albums']); }
}
