import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AlbumService } from '../../../services/album.service';
import { Album } from '../../../models/album.model';

@Component({
  selector: 'app-album-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './album-list.html',
  styleUrl: './album-list.css',
})
export class AlbumList implements OnInit {

  albums: Album[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(
    private albumService: AlbumService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('[AlbumList] ngOnInit');
    this.loadAlbums();
  }

  loadAlbums(): void {
    console.log('[AlbumList] loadAlbums()');
    this.isLoading = true;
    this.errorMessage = '';

    this.albumService.getAlbums().subscribe({
      next: (res) => {
        console.log('[AlbumList] API response:', res);
        this.albums = res.albums || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('[AlbumList] error loading albums:', err);
        this.errorMessage = err?.error?.message || 'Could not load albums';
        this.isLoading = false;
      }
    });
  }

  goToAlbum(albumId: string): void {
    this.router.navigate(['/albums', albumId]);
  }
}
