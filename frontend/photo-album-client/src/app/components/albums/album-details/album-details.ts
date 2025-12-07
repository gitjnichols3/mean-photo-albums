// src/app/components/albums/album-details/album-details.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Album } from '../../../models/album.model';
import { AlbumService } from '../../../services/album.service';
import { Photo } from '../../../models/photo.model';
import { PhotoService } from '../../../services/photo.service';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-album-details',
  templateUrl: './album-details.html',
  imports: [CommonModule, FormsModule],
})
export class AlbumDetailsComponent implements OnInit {
  // Main album state used by the template
  album: Album | null = null;

  // Status / errors
  isLoading = true;
  errorMessage = '';

  // Route param
  albumId: string | null = null;

  // Add-event form fields
  newEventName = '';
  newEventDate = '';
  newEventLocation = '';
  formError = '';

  // Editing state
  editingEventId: string | null = null;
  editEventName = '';
  editEventDate = '';
  editEventLocation = '';

  // Photos state
  photos: Photo[] = [];
  isLoadingPhotos = false;
  photoError = '';
  isUploading = false;
  selectedFiles: FileList | null = null;

  // Which event to attach new uploads to (optional)
  selectedEventId: string | '' = '';

  // Base URL for image files (strip /api from apiBaseUrl)
  imageBaseUrl = environment.apiBaseUrl.replace(/\/api\/?$/, '');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private albumService: AlbumService,
    private cdr: ChangeDetectorRef,
    private photoService: PhotoService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.isLoading = false;
      this.errorMessage = 'Album id is missing';
      this.album = null;
      this.cdr.detectChanges();
      return;
    }

    this.albumId = id;
    this.loadAlbum(id);
  }

  private loadAlbum(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('[AlbumDetails] loadAlbum()', id);

    this.albumService.getAlbumById(id).subscribe({
      next: (album) => {
        console.log('[AlbumDetails] Album loaded (param):', album);
        this.album = album;
        console.log('[AlbumDetails] this.album after assign:', this.album);

        this.isLoading = false;
        this.cdr.detectChanges();

        // Once album is loaded, load its photos
        this.loadPhotos();
      },
      error: (err) => {
        console.error('[AlbumDetails] Error loading album', err);
        this.errorMessage = 'Failed to load album';
        this.isLoading = false;
        this.album = null;

        this.cdr.detectChanges();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/albums']);
  }

  // ------------------------
  // PHOTOS
  // ------------------------
  private loadPhotos(): void {
    if (!this.album?._id) {
      return;
    }

    this.isLoadingPhotos = true;
    this.photoError = '';

    this.photoService.getPhotosForAlbum(this.album._id).subscribe({
      next: (photos) => {
        console.log('[AlbumDetails] Photos loaded:', photos);
        this.photos = photos;
        this.isLoadingPhotos = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[AlbumDetails] Error loading photos', err);
        this.photoError = 'Failed to load photos';
        this.isLoadingPhotos = false;
        this.cdr.detectChanges();
      },
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = input.files;
  }

  onUploadPhotos(event: Event): void {
    event.preventDefault();

    if (!this.album?._id || !this.selectedFiles || this.selectedFiles.length === 0) {
      return;
    }

    this.isUploading = true;
    this.photoError = '';

    const uploads$ = [];
    const eventId = this.selectedEventId || undefined;

    for (let i = 0; i < this.selectedFiles.length; i++) {
      const file = this.selectedFiles.item(i);
      if (file) {
        uploads$.push(this.photoService.uploadPhoto(this.album._id, file, eventId));
      }
    }

    if (uploads$.length === 0) {
      this.isUploading = false;
      return;
    }

    forkJoin(uploads$).subscribe({
      next: (uploadedPhotos: Photo[]) => {
        console.log('[AlbumDetails] Upload success:', uploadedPhotos);
        this.photos = [...this.photos, ...uploadedPhotos];
        this.isUploading = false;
        this.selectedFiles = null;
        // keep selectedEventId so you can upload multiple to same event
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[AlbumDetails] Error uploading photos', err);
        this.photoError = 'Failed to upload photos';
        this.isUploading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Photos attached to a given event
  getPhotosForEvent(eventId: string | null | undefined): Photo[] {
    if (!eventId) {
      return [];
    }
    return this.photos.filter((p) => p.eventId === eventId);
  }

  // Photos not attached to any event
  get unassignedPhotos(): Photo[] {
    return this.photos.filter((p) => !p.eventId);
  }

  // ------------------------
  // ADD EVENT
  // ------------------------
  addEvent(): void {
    this.formError = '';

    if (!this.albumId) {
      this.formError = 'Album id is missing';
      return;
    }

    const name = this.newEventName.trim();
    const date = this.newEventDate?.trim();
    const location = this.newEventLocation?.trim();

    if (!name) {
      this.formError = 'Event name is required';
      return;
    }

    const payload: { name: string; startDate?: string; location?: string } = {
      name,
    };

    if (date) {
      payload.startDate = date;
    }
    if (location) {
      payload.location = location;
    }

    console.log('[AlbumDetails] addEvent() payload:', payload);

    this.albumService.addEventToAlbum(this.albumId, payload).subscribe({
      next: (updatedAlbum) => {
        console.log(
          '[AlbumDetails] addEvent() success. Updated album:',
          updatedAlbum
        );
        this.album = updatedAlbum;

        // Reset form fields
        this.newEventName = '';
        this.newEventDate = '';
        this.newEventLocation = '';
        this.formError = '';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[AlbumDetails] Error adding event', err);
        this.formError = 'Failed to add event';
        this.cdr.detectChanges();
      },
    });
  }

  // ------------------------
  // EDIT EVENT
  // ------------------------
  startEditEvent(ev: any): void {
    this.formError = '';
    this.editingEventId = ev.eventId;

    this.editEventName = ev.name || '';
    this.editEventDate = ev.startDate
      ? String(ev.startDate).substring(0, 10)
      : '';
    this.editEventLocation = ev.location || '';

    console.log('[AlbumDetails] startEditEvent()', ev);
  }

  cancelEditEvent(): void {
    this.editingEventId = null;
    this.editEventName = '';
    this.editEventDate = '';
    this.editEventLocation = '';
  }

  saveEventChanges(): void {
    this.formError = '';

    if (!this.albumId || !this.editingEventId) {
      this.formError = 'Album or event id is missing';
      return;
    }

    const name = this.editEventName.trim();
    const date = this.editEventDate?.trim();
    const location = this.editEventLocation?.trim();

    if (!name) {
      this.formError = 'Event name is required';
      return;
    }

    const payload: { name: string; startDate?: string; location?: string } = {
      name,
    };

    if (date) {
      payload.startDate = date;
    }
    if (location) {
      payload.location = location;
    }

    console.log(
      '[AlbumDetails] saveEventChanges() albumId =',
      this.albumId,
      'eventId =',
      this.editingEventId,
      'payload =',
      payload
    );

    this.albumService
      .updateEventInAlbum(this.albumId, this.editingEventId, payload)
      .subscribe({
        next: (updatedAlbum) => {
          console.log(
            '[AlbumDetails] saveEventChanges() success. Updated album:',
            updatedAlbum
          );
          this.album = updatedAlbum;

          this.cancelEditEvent();
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[AlbumDetails] Error updating event', err);
          this.formError = 'Failed to update event';
          this.cdr.detectChanges();
        },
      });
  }

  // ------------------------
  // DELETE EVENT
  // ------------------------
  deleteEvent(ev: any): void {
    this.formError = '';

    if (!this.albumId || !ev?.eventId) {
      this.formError = 'Album or event id is missing';
      return;
    }

    const confirmed = window.confirm(
      `Delete event "${ev.name || ''}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    console.log(
      '[AlbumDetails] deleteEvent() albumId =',
      this.albumId,
      'eventId =',
      ev.eventId
    );

    this.albumService
      .deleteEventFromAlbum(this.albumId, ev.eventId)
      .subscribe({
        next: (updatedAlbum) => {
          console.log(
            '[AlbumDetails] deleteEvent() success. Updated album:',
            updatedAlbum
          );
          this.album = updatedAlbum;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[AlbumDetails] Error deleting event', err);
          this.formError = 'Failed to delete event';
          this.cdr.detectChanges();
        },
      });
  }

  // trackBy for ngFor
  trackEvent(index: number, ev: any): string {
    return ev.eventId || index.toString();
  }
}
