import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AlbumService, Album } from '../../core/services/album.service';

export interface AlbumFormData { album?: Album; }

@Component({
  selector: 'app-album-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.album ? 'Editar álbum' : 'Nuevo álbum' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="album-form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Total de láminas</mat-label>
          <input matInput type="number" formControlName="total_stickers">
        </mat-form-field>
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
    .error-msg { color: var(--mat-sys-error); font-size: 14px; }
    mat-dialog-content { min-width: 340px; }
    mat-spinner { display: inline-block; }
  `],
})
export class AlbumFormComponent {
  private albumService = inject(AlbumService);
  private dialogRef = inject(MatDialogRef<AlbumFormComponent>);
  readonly data = inject<AlbumFormData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  loading = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    name: [this.data.album?.name ?? '', Validators.required],
    total_stickers: [this.data.album?.total_stickers ?? 638, [Validators.required, Validators.min(1), Validators.max(5000)]],
    description: [this.data.album?.description ?? ''],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const payload = this.form.getRawValue();
    const op = this.data.album
      ? this.albumService.updateAlbum(this.data.album.id, payload)
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
