// src/app/services/photo.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { Photo } from '../models/photo.model';
import { AuthService } from './auth.service';

interface UploadPhotoResponse {
  message: string;
  photo: Photo;
}

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  // Base URL for all photo-related API calls
  private baseUrl = `${environment.apiBaseUrl}/photos`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Build headers for authenticated requests (no Content-Type here so FormData can set it)
  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();

    const token = this.authService.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // Upload a single photo file for an album (optionally tied to a specific event)
  uploadPhoto(
    albumId: string,
    file: File,
    eventId?: string
  ): Observable<Photo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('albumId', albumId);
    if (eventId) {
      formData.append('eventId', eventId);
    }

    return this.http
      .post<UploadPhotoResponse>(`${this.baseUrl}/upload`, formData, {
        headers: this.getAuthHeaders(),
      })
      .pipe(map((res) => res.photo));
  }

  // Load all photos for a given album from the backend
  getPhotosForAlbum(albumId: string): Observable<Photo[]> {
    return this.http
      .get<{ photos: Photo[] }>(
        `${this.baseUrl}/album/${albumId}`,
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.photos));
  }

  // Delete a single photo by id
  deletePhoto(photoId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/${photoId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Reassign a photo to a different event, or clear the event assignment
  reassignPhoto(photoId: string, eventId: string | null) {
    const body = { eventId };

    return this.http.patch<any>(
      `${environment.apiBaseUrl}/photos/${photoId}/event`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }
}
