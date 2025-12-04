// src/app/services/album.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Album } from '../models/album.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AlbumService {
  // Base URL for album API, e.g. https://localhost:3000/api/albums
  private baseUrl = `${environment.apiBaseUrl}/albums`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Build HttpHeaders with JWT if available
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

    // GET /api/albums
    getAlbums(): Observable<{ message: string; albums: Album[] }> {
    return this.http.get<{ message: string; albums: Album[] }>(this.baseUrl, {
        headers: this.getAuthHeaders()
    });
    }


  // GET /api/albums/:id
  getAlbumById(id: string): Observable<Album> {
    return this.http.get<Album>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // POST /api/albums
  createAlbum(payload: Partial<Album>): Observable<Album> {
    return this.http.post<Album>(this.baseUrl, payload, {
      headers: this.getAuthHeaders()
    });
  }

  // PUT /api/albums/:id
  updateAlbum(id: string, payload: Partial<Album>): Observable<Album> {
    return this.http.put<Album>(`${this.baseUrl}/${id}`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  // DELETE /api/albums/:id
  deleteAlbum(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Optional: POST /api/albums/:id/share
  shareAlbum(
    id: string,
    body: { emails: string[] }
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${id}/share`, body, {
      headers: this.getAuthHeaders()
    });
  }
}
