// src/app/components/albums/album-list/album-list.ts

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AlbumService } from '../../../services/album.service';
import { Album } from '../../../models/album.model';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-album-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './album-list.html',
  styleUrl: './album-list.css',
})
export class AlbumList implements OnInit {
  albums$!: Observable<Album[]>;
  errorMessage = '';

  constructor(
    private albumService: AlbumService,
    private router: Router,
    private authService: AuthService
  ) {}

get username(): string {
  const user = this.authService.getCurrentUser?.();

  if (!user) {
    return 'there';
  }

  // Try common property names safely
  const name =
    user.firstName ||
    user.name ||
    user.username ||
    user.email ||
    '';

  if (!name) {
    return 'there';
  }

  // Return first word only (first name)
  return name.split(' ')[0];
}




  ngOnInit(): void {
    this.loadAlbums();
  }

  loadAlbums(): void {
    this.errorMessage = '';

    this.albums$ = this.albumService.getAlbums().pipe(
      catchError(err => {
        console.error('[AlbumList] Error loading albums', err);
        this.errorMessage =
          err?.error?.message ||
          err?.message ||
          'Could not load albums';
        return of<Album[]>([]);
      })
    );
  }

  goToAlbum(albumId: string): void {
    this.router.navigate(['/albums', albumId]);
  }

  deleteAlbum(album: Album): void {
    const confirmed = window.confirm(
      `Delete album "${album.title}" and all of its events and photos?`
    );

    if (!confirmed) {
      return;
    }

    this.albumService.deleteAlbum(album._id).subscribe({
      next: () => {
        console.log('[AlbumList] deleteAlbum success for', album._id);
        // Blunt but reliable: reload the page so the list re-fetches from backend
        window.location.reload();
      },
      error: (err) => {
        console.error('[AlbumList] Error deleting album', err);
        this.errorMessage = 'Failed to delete album';
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
