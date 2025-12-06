// src/app/services/album.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { Album } from '../models/album.model';
import { AuthService } from './auth.service';




@Injectable({
  providedIn: 'root'
})
export class AlbumService {
  private baseUrl = `${environment.apiBaseUrl}/albums`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders().set('Content-Type', 'application/json');

    // Make absolutely sure this never throws synchronously
    try {
      const token = this.authService?.getToken?.();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      } else {
        console.warn('[AlbumService] No token found in getAuthHeaders()');
      }
    } catch (err) {
      console.error('[AlbumService] Error getting token:', err);
    }

    return headers;
  }

  /**
   * GET /api/albums
   * Handles either:
   *   - [Album, ...]
   *   - { message: string; albums: Album[] }
   */
  getAlbums(): Observable<Album[]> {
    console.log('[AlbumService] getAlbums() called. baseUrl =', this.baseUrl);

    return this.http
      .get<any>(this.baseUrl, {
        headers: this.getAuthHeaders()
      })
      .pipe(
        map((res: any) => {
          console.log('[AlbumService] Raw response from /albums:', res);

          if (Array.isArray(res)) {
            return res as Album[];
          }

          if (res && Array.isArray(res.albums)) {
            return res.albums as Album[];
          }

          return [];
        })
      );
  }

// GET /api/albums/:id
getAlbumById(id: string): Observable<Album> {
  console.log('[AlbumService] getAlbumById() called. id =', id);
  return this.http.get<any>(`${this.baseUrl}/${id}`, {
    headers: this.getAuthHeaders()
  }).pipe(
    map(res => {
      console.log('[AlbumService] Raw response from /albums/:id:', res);
      // Handle both { album: {...} } and plain album object
      if (res && res.album) {
        return res.album as Album;
      }
      return res as Album;
    })
  );
}


  /**
   * POST /api/albums
   */
  createAlbum(payload: { title: string; description?: string }): Observable<Album> {
    console.log('[AlbumService] createAlbum() payload:', payload);

    return this.http
      .post<any>(this.baseUrl, payload, {
        headers: this.getAuthHeaders()
      })
      .pipe(
        map((res: any) => {
          console.log('[AlbumService] Raw response from createAlbum:', res);
          if (res && res.album) {
            return res.album as Album;
          }
          return res as Album;
        })
      );
  }

    /**
   * POST /api/albums/:id/events
   * Adds a single event to an album and returns the updated album
   */
  addEventToAlbum(
    albumId: string,
    payload: { name: string; startDate?: string; location?: string }
  ): Observable<Album> {
    console.log('[AlbumService] addEventToAlbum() albumId =', albumId, 'payload =', payload);

    return this.http
      .post<any>(`${this.baseUrl}/${albumId}/events`, payload, {
        headers: this.getAuthHeaders()
      })
      .pipe(
        map((res: any) => {
          console.log('[AlbumService] Raw response from POST /albums/:id/events:', res);
          if (res && res.album) {
            return res.album as Album;
          }
          return res as Album;
        })
      );
  }

    /**
   * PUT /api/albums/:id/events/:eventId
   * Updates a single event in an album and returns the updated album
   */
  updateEventInAlbum(
    albumId: string,
    eventId: string,
    payload: { name: string; startDate?: string; location?: string }
  ): Observable<Album> {
    console.log('[AlbumService] updateEventInAlbum()', albumId, eventId, payload);

    return this.http
      .put<any>(`${this.baseUrl}/${albumId}/events/${eventId}`, payload, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => {
          console.log('[AlbumService] Raw response from PUT /albums/:id/events/:eventId:', res);
          if (res && res.album) {
            return res.album as Album;
          }
          return res as Album;
        })
      );
  }

  /**
   * DELETE /api/albums/:id/events/:eventId
   * Deletes a single event from an album and returns the updated album
   */
  deleteEventFromAlbum(albumId: string, eventId: string): Observable<Album> {
    console.log('[AlbumService] deleteEventFromAlbum()', albumId, eventId);

    return this.http
      .delete<any>(`${this.baseUrl}/${albumId}/events/${eventId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        map((res: any) => {
          console.log('[AlbumService] Raw response from DELETE /albums/:id/events/:eventId:', res);
          if (res && res.album) {
            return res.album as Album;
          }
          return res as Album;
        })
      );
  }



  // PUT /api/albums/:id
updateAlbum(id: string, update: Partial<Album>): Observable<Album> {
  console.log('[AlbumService] updateAlbum() called. id =', id, 'update =', update);

  return this.http.put<any>(`${this.baseUrl}/${id}`, update, {
    headers: this.getAuthHeaders()
  }).pipe(
    map(res => {
      console.log('[AlbumService] Raw response from PUT /albums/:id:', res);
      if (res && res.album) {
        return res.album as Album;
      }
      return res as Album;
    })
  );
}


}
