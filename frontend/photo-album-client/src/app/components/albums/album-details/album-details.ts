// src/app/components/albums/album-details/album-details.ts

import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
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
  styleUrls: ['./album-details.css'],
  imports: [CommonModule, FormsModule],
})
export class AlbumDetailsComponent implements OnInit {
  album: Album | null = null;
  isLoading = true;
  errorMessage = '';
  albumId: string | null = null;

  // Sharing
  shareSlug: string | null = null;
  shareUrl: string | null = null;
  shareError = '';
  isLoadingShare = false;
  copyStatus: 'idle' | 'copied' | 'error' = 'idle';

  // Add event
  newEventName = '';
  newEventDate = '';
  newEventLocation = '';
  formError = '';

  // Editing state
  editingEventId: string | null = null;

  // Photos
  photos: Photo[] = [];
  isLoadingPhotos = false;
  photoError = '';
  isUploading = false;
  selectedFiles: FileList | null = null;

  // Viewing selection (which event’s photos to show)
  selectedEventId: string | '' = '';
  selectedEventName = 'Select an event';

  // Photo viewer modal (lightbox)
  isPhotoViewerOpen = false;
  viewerPhotos: Photo[] = [];
  viewerIndex = 0;

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

        // If the album already has a shareSlug, compute the share URL immediately
        if ((album as any).shareSlug) {
          this.shareSlug = (album as any).shareSlug;
          this.shareUrl = `${window.location.origin}/share/${this.shareSlug}`;
        }

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
  /**
   * Parse an event date string into a local calendar Date.
   * Works for both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ".
   */
  private toLocalEventDate(value?: string | null): Date | null {
    if (!value) return null;

    const raw = value.toString();
    const datePart = raw.split('T')[0]; // strip any time/zone
    const parts = datePart.split('-');
    if (parts.length !== 3) return null;

    const [yyyyStr, mmStr, ddStr] = parts;
    const yyyy = Number(yyyyStr);
    const mm = Number(mmStr);
    const dd = Number(ddStr);

    if (
      Number.isNaN(yyyy) ||
      Number.isNaN(mm) ||
      Number.isNaN(dd)
    ) {
      return null;
    }

    // This creates a local date with the exact calendar day
    return new Date(yyyy, mm - 1, dd);
  }

  get sortedEvents(): any[] {
    if (!this.album?.events) return [];

    const eventsCopy = [...this.album.events];

    eventsCopy.sort((a: any, b: any) => {
      const aDate = this.toLocalEventDate(a.startDate);
      const bDate = this.toLocalEventDate(b.startDate);

      const aTime = aDate ? aDate.getTime() : NaN;
      const bTime = bDate ? bDate.getTime() : NaN;

      const aHasDate = !Number.isNaN(aTime);
      const bHasDate = !Number.isNaN(bTime);

      if (aHasDate && bHasDate) {
        return aTime - bTime; // oldest first
      }
      if (aHasDate && !bHasDate) return -1;
      if (!aHasDate && bHasDate) return 1;

      return 0;
    });

    return eventsCopy;
  }

  get timelineGroups(): { dateLabel: string; events: any[] }[] {
    const groups: { dateLabel: string; events: any[] }[] = [];
    const map = new Map<string, any[]>();

    for (const ev of this.sortedEvents) {
      let label = 'No date';

      if (ev.startDate) {
        const d = this.toLocalEventDate(ev.startDate);
        if (d) {
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
  // PHOTO VIEWER MODAL (LIGHTBOX)
  // ------------------------

  openPhotoViewer(startIndex: number): void {
    const baseList = this.selectedEventId
      ? this.selectedEventPhotos
      : this.unassignedPhotos;

    if (!baseList || baseList.length === 0) {
      return;
    }

    this.viewerPhotos = baseList;
    this.viewerIndex = startIndex;
    this.isPhotoViewerOpen = true;

    // Lock background scroll while viewer is open
    document.body.style.overflow = 'hidden';
  }

  closePhotoViewer(): void {
    this.isPhotoViewerOpen = false;

    // Restore background scroll
    document.body.style.overflow = '';
  }

  get currentViewerPhoto(): Photo | null {
    if (!this.viewerPhotos.length) return null;
    return this.viewerPhotos[this.viewerIndex] ?? null;
  }

  nextViewerPhoto(): void {
    if (!this.viewerPhotos.length) return;
    this.viewerIndex = (this.viewerIndex + 1) % this.viewerPhotos.length;
  }

  prevViewerPhoto(): void {
    if (!this.viewerPhotos.length) return;
    this.viewerIndex =
      (this.viewerIndex - 1 + this.viewerPhotos.length) %
      this.viewerPhotos.length;
  }

  // Keyboard navigation for the photo viewer
  @HostListener('window:keydown', ['$event'])
  onWindowKeyDown(event: KeyboardEvent): void {
    if (!this.isPhotoViewerOpen) return;

    switch (event.key) {
      case 'ArrowRight':
      case 'Right':
        event.preventDefault();
        this.nextViewerPhoto();
        break;
      case 'ArrowLeft':
      case 'Left':
        event.preventDefault();
        this.prevViewerPhoto();
        break;
      case 'Escape':
      case 'Esc':
        event.preventDefault();
        this.closePhotoViewer();
        break;
      default:
        break;
    }
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
        // Sort photos by "effective date": takenAt (EXIF) first, then uploadedAt
        this.photos = [...photos].sort((a, b) => {
          const aDate = a.takenAt
            ? new Date(a.takenAt as any)
            : a.uploadedAt
            ? new Date(a.uploadedAt as any)
            : null;

          const bDate = b.takenAt
            ? new Date(b.takenAt as any)
            : b.uploadedAt
            ? new Date(b.uploadedAt as any)
            : null;

          if (!aDate && !bDate) return 0;
          if (!aDate) return 1;
          if (!bDate) return -1;

          return aDate.getTime() - bDate.getTime();
        });

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

      onChangePhotoEvent(photo: Photo, newEventId: string): void {
    // Empty string from the dropdown means "unassigned"
    const targetEventId: string | null = newEventId || null;

    if (!photo._id) {
      return;
    }

    this.photoError = '';

    this.photoService.reassignPhoto(photo._id, targetEventId).subscribe({
      next: () => {
        // Reload photos so the photo moves to the correct group
        this.loadPhotos();
      },
      error: (err) => {
        console.error('[AlbumDetails] Error reassigning photo', err);
        this.photoError = 'Failed to reassign photo';
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
      if (!file) continue;

      uploads$.push(
        this.photoService.uploadPhoto(this.album._id, file, eventId)
      );
    }

    if (uploads$.length === 0) {
      this.isUploading = false;
      return;
    }

    forkJoin(uploads$).subscribe({
      next: () => {
        this.isUploading = false;
        this.selectedFiles = null;
        this.loadPhotos();
      },
      error: (err) => {
        console.error('[AlbumDetails] Error uploading photos', err);
        this.photoError = 'Failed to upload photos';
        this.isUploading = false;
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

  // ------------------------
  // EVENTS
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

    const payload: any = { name };
    if (date) payload.startDate = date;
    if (location) payload.location = location;

    // If we are editing, call update instead of add
    if (this.editingEventId) {
      this.albumService
        .updateEventInAlbum(this.albumId, this.editingEventId, payload)
        .subscribe({
          next: (updatedAlbum) => {
            this.album = updatedAlbum;
            this.resetEventForm();
            this.cdr.detectChanges();
          },
          error: (err: any) => {
            console.error('[AlbumDetails] Error updating event', err);
            this.formError = 'Failed to update event';
            this.cdr.detectChanges();
          },
        });
      return;
    }

    // Otherwise, normal add
    this.albumService.addEventToAlbum(this.albumId, payload).subscribe({
      next: (updatedAlbum) => {
        this.album = updatedAlbum;
        this.resetEventForm();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[AlbumDetails] Error adding event', err);
        this.formError = 'Failed to add event';
        this.cdr.detectChanges();
      },
    });
  }

  startEditEvent(ev: any): void {
    this.editingEventId = ev.eventId;
    this.newEventName = ev.name || '';
    this.newEventDate = ev.startDate ? ev.startDate.substring(0, 10) : '';
    this.newEventLocation = ev.location || '';
  }

  cancelEditEvent(): void {
    this.resetEventForm();
  }

  private resetEventForm(): void {
    this.editingEventId = null;
    this.newEventName = '';
    this.newEventDate = '';
    this.newEventLocation = '';
    this.formError = '';
  }

  editEvent(ev: any): void {
    if (!this.albumId || !ev.eventId) {
      return;
    }

    // name, date, location currently stored on this event
    const currentName = ev.name || '';

    // Normalize startDate into YYYY-MM-DD for the prompt WITHOUT using new Date()
    let currentDate = '';
    if (ev.startDate) {
      const raw = ev.startDate.toString();
      // Handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ"
      const datePart = raw.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        if (yyyy && mm && dd) {
          currentDate = `${yyyy}-${mm}-${dd}`;
        }
      }
    }

    const currentLocation = ev.location || '';

    // 1) Name
    const name = window.prompt('Edit event name', currentName);
    if (name === null) {
      return; // cancelled
    }

    // 2) Date
    const date = window.prompt(
      'Edit event date (YYYY-MM-DD, leave blank for none)',
      currentDate
    );
    if (date === null) {
      return; // cancelled
    }

    // 3) Location
    const location = window.prompt('Edit event location', currentLocation);
    if (location === null) {
      return; // cancelled
    }

    const trimmedName = name.trim() || currentName;
    const trimmedDate = date.trim();
    const trimmedLocation = location.trim();

    const payload: any = {
      name: trimmedName,
      startDate: trimmedDate || null,   // allow clearing date
      location: trimmedLocation,        // allow clearing location too
    };

    this.albumService
      .updateEventInAlbum(this.albumId, ev.eventId, payload)
      .subscribe({
        next: (updatedAlbum) => {
          this.album = updatedAlbum;

          if (this.selectedEventId === ev.eventId) {
            this.selectedEventName = trimmedName;
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[AlbumDetails] Error updating event', err);
          this.formError = 'Failed to update event';
          this.cdr.detectChanges();
        },
      });
  }

  deleteEvent(ev: any): void {
    if (!this.albumId || !ev.eventId) return;

    const confirmed = window.confirm(
      `Delete event "${ev.name}" and unassign any photos associated with it?`
    );

    if (!confirmed) return;

    this.albumService.deleteEventFromAlbum(this.albumId, ev.eventId).subscribe({
      next: (updatedAlbum) => {
        this.album = updatedAlbum;

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

  // ------------------------
  // SHARING
  // ------------------------

  generateShareLink(): void {
    if (!this.album?._id) {
      return;
    }

    this.isLoadingShare = true;
    this.shareError = '';
    this.copyStatus = 'idle';

    this.albumService.getShareLink(this.album._id).subscribe({
      next: ({ shareSlug }) => {
        this.shareSlug = shareSlug;
        this.shareUrl = `${window.location.origin}/share/${shareSlug}`;

        // Keep album object in sync if it has a shareSlug field
        if (this.album) {
          (this.album as any).shareSlug = shareSlug;
        }

        this.isLoadingShare = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('[AlbumDetails] Error generating share link', err);
        this.shareError = 'Failed to create share link';
        this.isLoadingShare = false;
        this.cdr.detectChanges();
      },
    });
  }

 async copyShareUrl(): Promise<void> {
  if (!this.shareUrl) return;

  try {
    // Prefer modern clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(this.shareUrl);
      this.copyStatus = 'copied';
      this.cdr.detectChanges();
    } else {
      // Fallback: use a temporary textarea + execCommand
      const textarea = document.createElement('textarea');
      textarea.value = this.shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const successful = document.execCommand
        ? document.execCommand('copy')
        : false;

      document.body.removeChild(textarea);

      this.copyStatus = successful ? 'copied' : 'error';
      this.cdr.detectChanges();
    }

    // Reset status after a short delay
    setTimeout(() => {
      this.copyStatus = 'idle';
      this.cdr.detectChanges();
    }, 2000);
  } catch (err) {
    console.error('[AlbumDetails] Clipboard error', err);
    this.copyStatus = 'error';
    this.cdr.detectChanges();

    setTimeout(() => {
      this.copyStatus = 'idle';
      this.cdr.detectChanges();
    }, 2000);
  }
}
}
