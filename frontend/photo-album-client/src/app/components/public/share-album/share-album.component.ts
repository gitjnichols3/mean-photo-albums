// src/app/components/public/share-album/share-album.component.ts

import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
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

  // --- Timeline helpers ---

  get sortedEvents(): PublicEvent[] {
    if (!this.album?.events) return [];

    const eventsCopy = [...this.album.events];

    eventsCopy.sort((a: any, b: any) => {
      const aTime = a.startDate ? new Date(a.startDate).getTime() : NaN;
      const bTime = b.startDate ? new Date(b.startDate).getTime() : NaN;

      const aHasDate = !Number.isNaN(aTime);
      const bHasDate = !Number.isNaN(bTime);

      if (aHasDate && bHasDate) return aTime - bTime;
      if (aHasDate && !bHasDate) return -1;
      if (!aHasDate && bHasDate) return 1;
      return 0;
    });

    return eventsCopy;
  }

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

  selectEvent(ev: PublicEvent): void {
    this.selectedEventId = ev.eventId;
    this.selectedEventName = ev.name || 'Selected event';

    // Changing context resets the viewer
    this.isPhotoViewerOpen = false;
    this.viewerPhotos = [];
    this.viewerIndex = 0;
  }

  clearEventSelection(): void {
    this.selectedEventId = '';
    this.selectedEventName = 'Unassigned photos';

    // Also reset viewer
    this.isPhotoViewerOpen = false;
    this.viewerPhotos = [];
    this.viewerIndex = 0;
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
}
