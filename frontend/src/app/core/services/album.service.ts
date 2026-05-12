import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type StickerStatus = 'missing' | 'have' | 'duplicate';

export interface AlbumTemplate {
  id: number;
  name: string;
  description: string;
  total_stickers: number;
  is_active: boolean;
  created_at: string;
}

export interface AlbumTemplateDetail extends AlbumTemplate {
  sections: TemplateSectionDetail[];
}

export interface TemplateSectionDetail {
  id: number;
  name: string;
  code_prefix: string;
  order: number;
  stickers: TemplateStickerDetail[];
}

export interface TemplateStickerDetail {
  code: string;
  label: string;
  position: number;
}

export interface Album {
  id: number;
  name: string;
  description: string;
  total_stickers: number;
  owner_id: number;
  template_id: number | null;
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
  code: string | null;
  status: StickerStatus;
  updated_at: string;
}

export interface SwapMatch {
  friend_id: number;
  friend_username: string;
  friend_full_name: string;
  friend_phone: string;
  can_give: string[];
  can_receive: string[];
  total_possible: number;
}

export interface StickerHolder {
  user_id: number;
  username: string;
  full_name: string;
  phone: string;
}

export interface MissingStickerMatch {
  sticker_code: string;
  sticker_number: number;
  holders: StickerHolder[];
}

export interface SwapRequestUser {
  id: number;
  username: string;
  full_name: string;
}

export interface SwapRequest {
  id: number;
  requester: SwapRequestUser;
  receiver: SwapRequestUser;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface BulkUpdateItem {
  number: number;
  status: StickerStatus;
}

export interface TemplateStickerInput {
  code: string;
  label: string;
  position: number;
}

export interface TemplateSectionInput {
  name: string;
  code_prefix: string;
  order: number;
  stickers: TemplateStickerInput[];
}

export interface AlbumTemplateCreatePayload {
  name: string;
  description: string;
  sections: TemplateSectionInput[];
}

@Injectable({ providedIn: 'root' })
export class AlbumService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/api/v1`;

  // ── Albums ─────────────────────────────────────────────────────────────────
  getAlbums(): Observable<Album[]> {
    return this.http.get<Album[]>(`${this.api}/albums`);
  }

  createAlbum(data: Partial<Album> & { template_id?: number | null }): Observable<Album> {
    return this.http.post<Album>(`${this.api}/albums`, data);
  }

  updateAlbum(id: number, data: Partial<Album>): Observable<Album> {
    return this.http.put<Album>(`${this.api}/albums/${id}`, data);
  }

  deleteAlbum(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/albums/${id}`);
  }

  // ── Templates (usuarios) ────────────────────────────────────────────────────
  getTemplates(): Observable<AlbumTemplate[]> {
    return this.http.get<AlbumTemplate[]>(`${this.api}/templates`);
  }

  getTemplate(id: number): Observable<AlbumTemplateDetail> {
    return this.http.get<AlbumTemplateDetail>(`${this.api}/templates/${id}`);
  }

  // ── Templates (admin) ───────────────────────────────────────────────────────
  adminGetTemplates(): Observable<AlbumTemplate[]> {
    return this.http.get<AlbumTemplate[]>(`${this.api}/admin/templates`);
  }

  adminGetTemplate(id: number): Observable<AlbumTemplateDetail> {
    return this.http.get<AlbumTemplateDetail>(`${this.api}/admin/templates/${id}`);
  }

  adminCreateTemplate(payload: AlbumTemplateCreatePayload): Observable<AlbumTemplate> {
    return this.http.post<AlbumTemplate>(`${this.api}/admin/templates`, payload);
  }

  adminUpdateTemplate(id: number, payload: { name: string; description: string; is_active: boolean }): Observable<AlbumTemplate> {
    return this.http.patch<AlbumTemplate>(`${this.api}/admin/templates/${id}`, payload);
  }

  adminToggleTemplate(id: number): Observable<AlbumTemplate> {
    return this.http.patch<AlbumTemplate>(`${this.api}/admin/templates/${id}/toggle`, {});
  }

  adminRebuildWc2026(id: number): Observable<AlbumTemplate> {
    return this.http.post<AlbumTemplate>(`${this.api}/admin/templates/${id}/rebuild-wc2026`, {});
  }

  adminDeleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/admin/templates/${id}`);
  }

  // ── Stickers ────────────────────────────────────────────────────────────────
  getStickers(albumId: number, status?: StickerStatus): Observable<Sticker[]> {
    const params: Record<string, string> = status ? { status_filter: status } : {};
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

  searchStickerHolders(albumId: number, code: string): Observable<StickerHolder[]> {
    return this.http.get<StickerHolder[]>(
      `${this.api}/albums/${albumId}/stickers/search`,
      { params: { code: code.toUpperCase() } }
    );
  }

  getMissingHolders(albumId: number): Observable<MissingStickerMatch[]> {
    return this.http.get<MissingStickerMatch[]>(
      `${this.api}/albums/${albumId}/stickers/missing-holders`
    );
  }

  // ── Swap Requests ──────────────────────────────────────────────────────────
  sendSwapRequest(receiverId: number, message: string): Observable<SwapRequest> {
    return this.http.post<SwapRequest>(`${this.api}/swap-requests`, {
      receiver_id: receiverId,
      message,
    });
  }

  getReceivedRequests(): Observable<SwapRequest[]> {
    return this.http.get<SwapRequest[]>(`${this.api}/swap-requests/received`);
  }

  getSentRequests(): Observable<SwapRequest[]> {
    return this.http.get<SwapRequest[]>(`${this.api}/swap-requests/sent`);
  }

  getPendingCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.api}/swap-requests/pending-count`);
  }

  getRequestWithUser(userId: number): Observable<SwapRequest | null> {
    return this.http.get<SwapRequest | null>(`${this.api}/swap-requests/with/${userId}`);
  }

  respondRequest(requestId: number, action: 'accept' | 'decline'): Observable<SwapRequest> {
    return this.http.put<SwapRequest>(`${this.api}/swap-requests/${requestId}/respond`, { action });
  }
}
