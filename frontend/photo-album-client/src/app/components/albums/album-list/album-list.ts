import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AlbumService } from '../../../services/album.service';
import { Album } from '../../../models/album.model';

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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAlbums();
  }

  loadAlbums(): void {
    this.errorMessage = '';

    this.albums$ = this.albumService.getAlbums().pipe(
      catchError(err => {
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
}
