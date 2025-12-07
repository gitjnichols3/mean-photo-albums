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
  private baseUrl = `${environment.apiBaseUrl}/photos`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Only add Authorization; let the browser set Content-Type for FormData
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

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

  getPhotosForAlbum(albumId: string): Observable<Photo[]> {
    return this.http
      .get<{ photos: Photo[] }>(
        `${this.baseUrl}/album/${albumId}`,
        { headers: this.getAuthHeaders() }
      )
      .pipe(map((res) => res.photos));
  }
}
