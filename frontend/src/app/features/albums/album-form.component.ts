import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AlbumService, Album, AlbumTemplate } from '../../core/services/album.service';

export interface AlbumFormData { album?: Album; }

@Component({
  selector: 'app-album-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatProgressSpinnerModule, MatDividerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.album ? 'Editar álbum' : 'Nuevo álbum' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="album-form" (ngSubmit)="submit()">

        @if (!data.album && templates().length > 0) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Usar template predefinido (opcional)</mat-label>
            <mat-select formControlName="template_id" (selectionChange)="onTemplateChange($event.value)">
              <mat-option [value]="null">— Sin template (manual) —</mat-option>
              @for (t of templates(); track t.id) {
                <mat-option [value]="t.id">{{ t.name }} ({{ t.total_stickers }} láminas)</mat-option>
              }
            </mat-select>
            <mat-hint>Al usar un template, las láminas se crean automáticamente con sus códigos</mat-hint>
          </mat-form-field>
          <mat-divider class="divider"></mat-divider>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>

        @if (!form.get('template_id')?.value) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Total de láminas</mat-label>
            <input matInput type="number" formControlName="total_stickers">
          </mat-form-field>
        } @else {
          <p class="template-info">
            <strong>{{ selectedTemplate()?.total_stickers }}</strong> láminas — definidas por el template
          </p>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        @if (error()) {
          <p class="error-msg">{{ error() }}</p>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" form="album-form" type="submit"
              [disabled]="form.invalid || loading()">
        @if (loading()) { <mat-spinner diameter="18"></mat-spinner> }
        @else { Guardar }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; display: block; margin-bottom: 8px; }
    .error-msg { color: var(--mat-sys-error, #f44336); font-size: 14px; }
    mat-dialog-content { min-width: 380px; }
    mat-spinner { display: inline-block; }
    .divider { margin: 8px 0 16px; }
    .template-info { font-size: 14px; color: rgba(0,0,0,.6); margin: 4px 0 12px; padding: 8px 12px; background: rgba(0,0,0,.04); border-radius: 4px; }
  `],
})
export class AlbumFormComponent implements OnInit {
  private albumService = inject(AlbumService);
  private dialogRef = inject(MatDialogRef<AlbumFormComponent>);
  readonly data = inject<AlbumFormData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  loading = signal(false);
  error = signal('');
  templates = signal<AlbumTemplate[]>([]);
  selectedTemplate = signal<AlbumTemplate | null>(null);

  form = this.fb.nonNullable.group({
    name: [this.data.album?.name ?? '', Validators.required],
    total_stickers: [this.data.album?.total_stickers ?? 638, [Validators.required, Validators.min(1), Validators.max(10000)]],
    description: [this.data.album?.description ?? ''],
    template_id: [this.data.album?.template_id ?? null as number | null],
  });

  ngOnInit(): void {
    if (!this.data.album) {
      this.albumService.getTemplates().subscribe({
        next: (ts) => this.templates.set(ts),
        error: () => {},
      });
    }
  }

  onTemplateChange(templateId: number | null): void {
    if (!templateId) {
      this.selectedTemplate.set(null);
      return;
    }
    const t = this.templates().find(t => t.id === templateId) ?? null;
    this.selectedTemplate.set(t);
    if (t && !this.form.get('name')?.value) {
      this.form.patchValue({ name: t.name, description: t.description });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const { name, total_stickers, description, template_id } = this.form.getRawValue();
    const payload = template_id
      ? { name, description, template_id }
      : { name, total_stickers, description, template_id: null };

    const op = this.data.album
      ? this.albumService.updateAlbum(this.data.album.id, { name, total_stickers, description })
      : this.albumService.createAlbum(payload);

    op.subscribe({
      next: (album) => this.dialogRef.close(album),
      error: (err) => {
        this.error.set(err.error?.detail ?? 'Error al guardar');
        this.loading.set(false);
      },
    });
  }
}
