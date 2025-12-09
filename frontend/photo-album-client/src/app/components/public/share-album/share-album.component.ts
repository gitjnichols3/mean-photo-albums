// src/app/components/public/share-album/share-album.component.ts

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../../environments/environment';
import { Photo } from '../../../models/photo.model';

interface PublicEvent {
  eventId: string;
  name: string;
  startDate?: string;
  endDate?: string | null;
  location?: string;
}

interface PublicAlbum {
  _id: string;
  title: string;
  description?: string;
  events: PublicEvent[];
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  standalone: true,
  selector: 'app-share-album',
  imports: [CommonModule],
  templateUrl: './share-album.component.html',
})
export class ShareAlbumComponent implements OnInit {
  // Shared album and photos loaded by a public slug (no login required)
  album: PublicAlbum | null = null;
  photos: Photo[] = [];

  isLoading = true;
  errorMessage = '';

  // Which event’s photos are shown on the right
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
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    console.log('[ShareAlbum] slug from route:', slug);

    if (!slug) {
      this.isLoading = false;
      this.errorMessage = 'Missing album link';
      this.cdr.detectChanges();
      return;
    }

    // Public endpoint on the backend that returns album + photos by share slug
    const url = `${environment.apiBaseUrl}/public/albums/${slug}`;
    console.log('[ShareAlbum] GET', url);

    this.http
      .get<{ album: PublicAlbum; photos: Photo[] }>(url)
      .subscribe({
        next: ({ album, photos }) => {
          console.log('[ShareAlbum] Loaded album:', album);
          console.log('[ShareAlbum] Loaded photos:', photos);
          this.album = album;
          this.photos = photos || [];
          this.isLoading = false;

          // Default view: unassigned photos
          this.clearEventSelection();

          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('[ShareAlbum] Error loading shared album', err);
          this.errorMessage = 'Failed to load this shared album';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  /**
   * Parse an event date string into a local calendar Date.
   * Handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ"
   * so the shared timeline matches the owner’s view.
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

    if (Number.isNaN(yyyy) || Number.isNaN(mm) || Number.isNaN(dd)) {
      return null;
    }

    // Local date with the correct calendar day
    return new Date(yyyy, mm - 1, dd);
  }

  // --- Timeline helpers ---

  // Events sorted by date so the public timeline reads oldest → newest
  get sortedEvents(): PublicEvent[] {
    if (!this.album?.events) return [];

    const eventsCopy = [...this.album.events];

    eventsCopy.sort((a: PublicEvent, b: PublicEvent) => {
      const aDate = this.toLocalEventDate(a.startDate ?? null);
      const bDate = this.toLocalEventDate(b.startDate ?? null);

      const aTime = aDate ? aDate.getTime() : NaN;
      const bTime = bDate ? bDate.getTime() : NaN;

      const aHasDate = !Number.isNaN(aTime);
      const bHasDate = !Number.isNaN(bTime);

      if (aHasDate && bHasDate) {
        return aTime - bTime; // oldest first
      }
      if (aHasDate && !bHasDate) return -1; // dated before undated
      if (!aHasDate && bHasDate) return 1;  // undated after dated

      return 0;
    });

    return eventsCopy;
  }

  // Group events by calendar date for the shared timeline UI
  get timelineGroups(): { dateLabel: string; events: PublicEvent[] }[] {
    const groups: { dateLabel: string; events: PublicEvent[] }[] = [];
    const map = new Map<string, PublicEvent[]>();

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

  // --- Selection ---

  // Choose which event’s photos are displayed in the right-hand grid
  selectEvent(ev: PublicEvent): void {
    this.selectedEventId = ev.eventId;
    this.selectedEventName = ev.name || 'Selected event';

    // Changing context resets the viewer
    this.isPhotoViewerOpen = false;
    this.viewerPhotos = [];
    this.viewerIndex = 0;
  }

  // Show unassigned photos instead of a specific event
  clearEventSelection(): void {
    this.selectedEventId = '';
    this.selectedEventName = 'Unassigned photos';

    // Also reset viewer
    this.isPhotoViewerOpen = false;
    this.viewerPhotos = [];
    this.viewerIndex = 0;
  }

  /**
   * Photos for the currently-selected event, sorted chronologically.
   */
  get selectedEventPhotos(): Photo[] {
    if (!this.selectedEventId) return [];
    return this.getPhotosForEvent(this.selectedEventId);
  }

  /**
   * Unassigned photos, sorted chronologically.
   */
  get unassignedPhotos(): Photo[] {
    return this.getUnassignedPhotos();
  }

  // ------------------------
  // PHOTO VIEWER MODAL (LIGHTBOX)
  // ------------------------

  // Open the lightbox for the current list (event or unassigned)
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

  // --- Photo time + sorted lists for events/unassigned ---

  // Pick a consistent "effective time" for a photo: EXIF first, then created/uploaded
  private getPhotoTime(p: any): number {
    const source = p?.takenAt || p?.createdAt || p?.uploadedAt || null;

    if (!source) return 0;

    const d = new Date(source);
    const t = d.getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  // Photos for a specific event, oldest → newest
  getPhotosForEvent(eventId: string): Photo[] {
    if (!this.photos || !Array.isArray(this.photos)) {
      return [];
    }

    const list = this.photos.filter((p: any) => p.eventId === eventId);

    return list.slice().sort((a, b) => {
      const aTime = this.getPhotoTime(a);
      const bTime = this.getPhotoTime(b);
      return aTime - bTime; // oldest first
    });
  }

  // Photos with no event assignment, oldest → newest
  getUnassignedPhotos(): Photo[] {
    if (!this.photos || !Array.isArray(this.photos)) {
      return [];
    }

    const list = this.photos.filter((p: any) => !p.eventId);

    return list.slice().sort((a, b) => {
      const aTime = this.getPhotoTime(a);
      const bTime = this.getPhotoTime(b);
      return aTime - bTime; // oldest first
    });
  }
}
