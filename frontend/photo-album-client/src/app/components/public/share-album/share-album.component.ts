// src/app/components/public/share-album/share-album.component.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

  selectedEventId: string | '' = '';
  selectedEventName = 'Select an event';

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
}
