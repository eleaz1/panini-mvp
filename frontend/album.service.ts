// src/app/core/services/album.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type StickerStatus = 'missing' | 'have' | 'duplicate';

export interface Album {
  id: number;
  name: string;
  description: string;
  total_stickers: number;
  owner_id: number;
  created_at: string;
}

export interface AlbumStats {
  total: number;
  have: number;
  missing: number;
  duplicate: number;
  completion_pct: number;
}

export interface Sticker {
  id: number;
  album_id: number;
  user_id: number;
  number: number;
  status: StickerStatus;
  updated_at: string;
}

export interface SwapMatch {
  friend_id: number;
  friend_username: string;
  can_give: number[];
  can_receive: number[];
  total_possible: number;
}

export interface BulkUpdateItem {
  number: number;
  status: StickerStatus;
}

@Injectable({ providedIn: 'root' })
export class AlbumService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/v1`;

  getAlbums(): Observable<Album[]> {
    return this.http.get<Album[]>(`${this.api}/albums`);
  }

  createAlbum(data: Partial<Album>): Observable<Album> {
    return this.http.post<Album>(`${this.api}/albums`, data);
  }

  updateAlbum(id: number, data: Partial<Album>): Observable<Album> {
    return this.http.put<Album>(`${this.api}/albums/${id}`, data);
  }

  deleteAlbum(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/albums/${id}`);
  }

  getStickers(albumId: number, status?: StickerStatus): Observable<Sticker[]> {
    const params = status ? { status_filter: status } : {};
    return this.http.get<Sticker[]>(`${this.api}/albums/${albumId}/stickers`, { params });
  }

  updateSticker(albumId: number, number: number, status: StickerStatus): Observable<Sticker> {
    return this.http.patch<Sticker>(
      `${this.api}/albums/${albumId}/stickers/${number}`,
      { status }
    );
  }

  bulkUpdate(albumId: number, stickers: BulkUpdateItem[]): Observable<Sticker[]> {
    return this.http.post<Sticker[]>(
      `${this.api}/albums/${albumId}/stickers/bulk`,
      { stickers }
    );
  }

  getStats(albumId: number): Observable<AlbumStats> {
    return this.http.get<AlbumStats>(`${this.api}/albums/${albumId}/stickers/stats`);
  }

  getSwapMatches(albumId: number): Observable<SwapMatch[]> {
    return this.http.get<SwapMatch[]>(`${this.api}/albums/${albumId}/stickers/swaps`);
  }
}
