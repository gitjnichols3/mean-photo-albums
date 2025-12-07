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
  album: Album | null = null;
  isLoading = true;
  errorMessage = '';
  albumId: string | null = null;

  // Add event
  newEventName = '';
  newEventDate = '';
  newEventLocation = '';
  formError = '';

  // Photos
  photos: Photo[] = [];
  isLoadingPhotos = false;
  photoError = '';
  isUploading = false;
  selectedFiles: FileList | null = null;

  // Viewing selection (which event’s photos to show)
  selectedEventId: string | '' = '';
  selectedEventName = 'Select an event';

  // Base URL for images (strip /api from apiBaseUrl)
  imageBaseUrl = environment.apiBaseUrl.replace(/\/api\/?$/, '');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private albumService: AlbumService,
    private photoService: PhotoService,
    private cdr: ChangeDetectorRef
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

    this.albumService.getAlbumById(id).subscribe({
      next: (album) => {
        this.album = album;
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
  // TIMELINE: sorted + grouped
  // ------------------------

  // Events sorted by date (oldest → newest), undated at the end
  get sortedEvents(): any[] {
    if (!this.album?.events) return [];

    const eventsCopy = [...this.album.events];

    eventsCopy.sort((a: any, b: any) => {
      const aTime = a.startDate ? new Date(a.startDate).getTime() : NaN;
      const bTime = b.startDate ? new Date(b.startDate).getTime() : NaN;

      const aHasDate = !Number.isNaN(aTime);
      const bHasDate = !Number.isNaN(bTime);

      if (aHasDate && bHasDate) {
        return aTime - bTime; // oldest first
      }
      if (aHasDate && !bHasDate) return -1; // dated before undated
      if (!aHasDate && bHasDate) return 1;  // undated after dated

      return 0; // both no date → keep relative order
    });

    return eventsCopy;
  }

  // Groups for timeline display: [{ dateLabel: 'July 14, 2025', events: [...] }, ...]
  get timelineGroups(): { dateLabel: string; events: any[] }[] {
    const groups: { dateLabel: string; events: any[] }[] = [];
    const map = new Map<string, any[]>();

    for (const ev of this.sortedEvents) {
      let label = 'No date';

      if (ev.startDate) {
        const d = new Date(ev.startDate);
        if (!Number.isNaN(d.getTime())) {
          label = d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
      }

      if (!map.has(label)) {
        map.set(label, []);
      }
      map.get(label)!.push(ev);
    }

    for (const [dateLabel, events] of map.entries()) {
      groups.push({ dateLabel, events });
    }

    return groups;
  }

  // ------------------------
  // VIEW SELECTION
  // ------------------------

  selectEventForViewing(ev: any): void {
    this.selectedEventId = ev.eventId;
    this.selectedEventName = ev.name || 'Selected event';
  }

  clearEventSelection(): void {
    this.selectedEventId = '';
    this.selectedEventName = 'Unassigned photos';
  }

  get selectedEventPhotos(): Photo[] {
    if (!this.selectedEventId) return [];
    return this.photos.filter((p) => p.eventId === this.selectedEventId);
  }

  get unassignedPhotos(): Photo[] {
    return this.photos.filter((p) => !p.eventId);
  }

  // ------------------------
  // PHOTOS
  // ------------------------

  private loadPhotos(): void {
    if (!this.album?._id) return;

    this.isLoadingPhotos = true;
    this.photoError = '';

    this.photoService.getPhotosForAlbum(this.album._id).subscribe({
      next: (photos) => {
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
        this.photos = [...this.photos, ...uploadedPhotos];
        this.isUploading = false;
        this.selectedFiles = null;
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

  // ------------------------
  // EVENTS (add + delete)
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

    if (date) payload.startDate = date;
    if (location) payload.location = location;

    this.albumService.addEventToAlbum(this.albumId, payload).subscribe({
      next: (updatedAlbum) => {
        this.album = updatedAlbum;

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

    this.albumService.deleteEventFromAlbum(this.albumId, ev.eventId).subscribe({
      next: (updatedAlbum) => {
        this.album = updatedAlbum;

        // If we just deleted the selected event, clear the selection
        if (this.selectedEventId === ev.eventId) {
          this.clearEventSelection();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[AlbumDetails] Error deleting event', err);
        this.formError = 'Failed to delete event';
        this.cdr.detectChanges();
      },
    });
  }

  trackEvent(index: number, ev: any): string {
    return ev.eventId || index.toString();
  }
  deletePhoto(p: Photo): void {
    const confirmed = window.confirm('Delete this photo permanently?');

    if (!confirmed) return;

    this.photoService.deletePhoto(p._id).subscribe({
      next: () => {
        this.photos = this.photos.filter((photo) => photo._id !== p._id);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[AlbumDetails] Error deleting photo', err);
        this.photoError = 'Failed to delete photo';
        this.cdr.detectChanges();
      },
    });
  }


}
