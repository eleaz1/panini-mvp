import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AlbumService, AlbumTemplate } from '../../core/services/album.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-templates',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatTooltipModule, MatMenuModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-left">
          <button mat-icon-button (click)="router.navigate(['/albums'])" matTooltip="Volver">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>Administración — Templates de Álbumes</h1>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="router.navigate(['/admin/users'])" matTooltip="Gestión de usuarios">
            <mat-icon>people</mat-icon> Usuarios
          </button>
          <button mat-raised-button color="primary" (click)="showCreateForm.set(!showCreateForm())">
            <mat-icon>{{ showCreateForm() ? 'close' : 'add' }}</mat-icon>
            {{ showCreateForm() ? 'Cancelar' : 'Nuevo template' }}
          </button>
          <button mat-icon-button (click)="auth.logout()" matTooltip="Cerrar sesión">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </header>

      <!-- Formulario de creación rápida (JSON) -->
      @if (showCreateForm()) {
        <mat-card class="create-form-card">
          <mat-card-header>
            <mat-card-title>Crear template personalizado</mat-card-title>
            <mat-card-subtitle>Define secciones y láminas en formato JSON</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="createForm" (ngSubmit)="createTemplate()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre del álbum</mat-label>
                <input matInput formControlName="name" placeholder="Ej: Champions League 2025">
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Descripción</mat-label>
                <textarea matInput formControlName="description" rows="2"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Secciones (JSON)</mat-label>
                <textarea matInput formControlName="sections_json" rows="10"
                  placeholder='[{"name":"Argentina","code_prefix":"ARG","order":1,"stickers":[{"code":"ARG-1","label":"Escudo","position":1},{"code":"ARG-2","label":"Foto grupal","position":2}]}]'>
                </textarea>
                <mat-hint>Array de secciones con campos: name, code_prefix, order, stickers[]</mat-hint>
              </mat-form-field>
              @if (createError()) {
                <p class="error-msg">{{ createError() }}</p>
              }
              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit"
                        [disabled]="createForm.invalid || creating()">
                  @if (creating()) { <mat-spinner diameter="18"></mat-spinner> }
                  @else { Crear template }
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }

      <!-- Lista de templates -->
      @if (loading()) {
        <div class="centered"><mat-spinner></mat-spinner></div>
      } @else if (templates().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">library_books</mat-icon>
          <p>No hay templates creados. El template del Mundial 2026 se crea automáticamente al iniciar el servidor.</p>
        </div>
      } @else {
        <div class="templates-grid">
          @for (t of templates(); track t.id) {
            <mat-card class="template-card" [class.inactive]="!t.is_active">
              <mat-card-header>
                <mat-card-title>{{ t.name }}</mat-card-title>
                <mat-card-subtitle>{{ t.total_stickers }} láminas</mat-card-subtitle>
                <button mat-icon-button class="card-menu-btn"
                        [matMenuTriggerFor]="cardMenu"
                        (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #cardMenu>
                  <button mat-menu-item (click)="startEdit(t)">
                    <mat-icon>edit</mat-icon> Editar
                  </button>
                  <button mat-menu-item (click)="rebuildWc2026(t)"
                          matTooltip="Reconstruye las láminas con los códigos oficiales">
                    <mat-icon>refresh</mat-icon> Reconstruir WC2026
                  </button>
                  <button mat-menu-item (click)="deleteTemplate(t)">
                    <mat-icon color="warn">delete</mat-icon> Eliminar
                  </button>
                </mat-menu>
              </mat-card-header>
              <mat-card-content>
                <p class="description">{{ t.description || 'Sin descripción' }}</p>
                <div class="card-footer">
                  <mat-chip [color]="t.is_active ? 'primary' : undefined" highlighted>
                    {{ t.is_active ? 'Activo' : 'Inactivo' }}
                  </mat-chip>
                  @if (!t.is_active) {
                    <button mat-raised-button color="accent" class="activate-btn"
                            (click)="toggleTemplate(t)">
                      <mat-icon>visibility</mat-icon> Activar
                    </button>
                  } @else {
                    <button mat-stroked-button class="deactivate-btn"
                            (click)="toggleTemplate(t)">
                      <mat-icon>visibility_off</mat-icon> Desactivar
                    </button>
                  }
                </div>
              </mat-card-content>

              <!-- Inline edit form -->
              @if (editingId() === t.id) {
                <mat-card-content class="edit-form">
                  <form [formGroup]="editForm" (ngSubmit)="saveEdit(t.id)">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Nombre</mat-label>
                      <input matInput formControlName="name">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Descripción</mat-label>
                      <textarea matInput formControlName="description" rows="2"></textarea>
                    </mat-form-field>
                    @if (editError()) {
                      <p class="error-msg">{{ editError() }}</p>
                    }
                    <div class="form-actions">
                      <button mat-button type="button" (click)="editingId.set(null)">Cancelar</button>
                      <button mat-raised-button color="primary" type="submit"
                              [disabled]="editForm.invalid || saving()">
                        @if (saving()) { <mat-spinner diameter="18"></mat-spinner> }
                        @else { Guardar }
                      </button>
                    </div>
                  </form>
                </mat-card-content>
              }
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .page-header h1 { margin: 0; font-size: 1.4rem; }
    .header-actions { display: flex; gap: 8px; align-items: center; }
    .create-form-card { margin-bottom: 24px; }
    .full-width { width: 100%; display: block; margin-bottom: 12px; }
    .form-actions { display: flex; justify-content: flex-end; padding-top: 8px; }
    .error-msg { color: var(--mat-sys-error, #f44336); font-size: 14px; }
    .templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .template-card { position: relative; }
    .template-card.inactive { opacity: 0.75; border: 2px dashed #bdbdbd; }
    .card-menu-btn { position: absolute; top: 8px; right: 8px; }
    .description { color: rgba(0,0,0,.6); font-size: 14px; margin-bottom: 12px; min-height: 40px; }
    .card-footer { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .activate-btn { font-weight: 700; }
    .deactivate-btn { font-size: 13px; }
    .edit-form { border-top: 1px solid #e0e0e0; padding-top: 12px; margin-top: 8px; }
    .centered { display: flex; justify-content: center; padding: 64px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px; text-align: center; }
    .empty-icon { font-size: 64px; height: 64px; width: 64px; color: rgba(0,0,0,.2); }
    mat-spinner { display: inline-block; }
  `],
})
export class AdminTemplatesComponent implements OnInit {
  protected albumService = inject(AlbumService);
  protected auth = inject(AuthService);
  protected router = inject(Router);
  private fb = inject(FormBuilder);

  templates = signal<AlbumTemplate[]>([]);
  loading = signal(true);
  showCreateForm = signal(false);
  creating = signal(false);
  createError = signal('');

  editingId = signal<number | null>(null);
  saving = signal(false);
  editError = signal('');

  createForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    sections_json: ['', Validators.required],
  });

  editForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.albumService.adminGetTemplates().subscribe({
      next: (ts) => { this.templates.set(ts); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  createTemplate(): void {
    if (this.createForm.invalid) return;
    const { name, description, sections_json } = this.createForm.getRawValue();
    let sections: unknown;
    try {
      sections = JSON.parse(sections_json);
    } catch {
      this.createError.set('JSON inválido en las secciones');
      return;
    }
    this.creating.set(true);
    this.createError.set('');
    this.albumService.adminCreateTemplate({ name, description, sections: sections as never }).subscribe({
      next: () => {
        this.showCreateForm.set(false);
        this.createForm.reset();
        this.load();
        this.creating.set(false);
      },
      error: (err) => {
        this.createError.set(err.error?.detail ?? 'Error al crear template');
        this.creating.set(false);
      },
    });
  }

  toggleTemplate(t: AlbumTemplate): void {
    this.albumService.adminToggleTemplate(t.id).subscribe(() => this.load());
  }

  deleteTemplate(t: AlbumTemplate): void {
    if (!confirm(`¿Eliminar el template "${t.name}"? Esta acción no se puede deshacer.`)) return;
    this.albumService.adminDeleteTemplate(t.id).subscribe(() => this.load());
  }

  startEdit(t: AlbumTemplate): void {
    this.editForm.setValue({ name: t.name, description: t.description });
    this.editError.set('');
    this.editingId.set(t.id);
  }

  saveEdit(id: number): void {
    if (this.editForm.invalid) return;
    const { name, description } = this.editForm.getRawValue();
    const current = this.templates().find(t => t.id === id);
    if (!current) return;
    this.saving.set(true);
    this.albumService.adminUpdateTemplate(id, { name, description, is_active: current.is_active }).subscribe({
      next: () => {
        this.editingId.set(null);
        this.saving.set(false);
        this.load();
      },
      error: (err) => {
        this.editError.set(err.error?.detail ?? 'Error al guardar');
        this.saving.set(false);
      },
    });
  }

  rebuildWc2026(t: AlbumTemplate): void {
    if (!confirm(`¿Reconstruir las láminas de "${t.name}" desde los datos oficiales del WC2026? Los álbumes existentes no se verán afectados.`)) return;
    this.albumService.adminRebuildWc2026(t.id).subscribe({
      next: () => { alert('Template reconstruido correctamente.'); this.load(); },
      error: (err) => alert(err.error?.detail ?? 'Error al reconstruir'),
    });
  }
}
