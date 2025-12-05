import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { Album } from '../../../models/album.model';
import { AlbumService } from '../../../services/album.service';

@Component({
  standalone: true,
  selector: 'app-album-details',
  templateUrl: './album-details.html',
  imports: [CommonModule, FormsModule]
})
export class AlbumDetailsComponent implements OnInit {
  album$!: Observable<Album | null>;

  isLoading = true;
  errorMessage = '';

  // Form fields for creating a new event
  newEventName = '';
  newEventDate = '';
  newEventLocation = '';
  formError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private albumService: AlbumService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.isLoading = false;
      this.errorMessage = 'Album id is missing';
      this.album$ = of(null);
      return;
    }

    this.loadAlbum(id);
  }

  private loadAlbum(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.album$ = this.albumService.getAlbumById(id).pipe(
      tap({
        next: () => {
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading album', err);
          this.errorMessage = 'Failed to load album';
          this.isLoading = false;
        }
      }),
      catchError((err) => {
        console.error('Album load error', err);
        this.errorMessage = 'Failed to load album';
        this.isLoading = false;
        return of(null);
      })
    );
  }

  goBack(): void {
    this.router.navigate(['/albums']);
  }

  addEvent(album: Album | null): void {
    this.formError = '';

    if (!album) {
      return;
    }

    const name = this.newEventName.trim();
    const date = this.newEventDate?.trim();
    const location = this.newEventLocation?.trim();

    if (!name) {
      this.formError = 'Event name is required';
      return;
    }

    // Local event object; no dependency on AlbumEvent type
    const newEvent = {
      name,
      startDate: date || undefined,
      location: location || undefined
    };

    // Ensure events exists and is an array
    if (!Array.isArray((album as any).events)) {
      (album as any).events = [];
    }

    (album as any).events.push(newEvent);

    this.resetEventForm();

    // Later you can hook this into an API call to persist the new event
    // this.albumService.addEventToAlbum(album._id, newEvent).subscribe(...)
  }

  private resetEventForm(): void {
    this.newEventName = '';
    this.newEventDate = '';
    this.newEventLocation = '';
  }
}
