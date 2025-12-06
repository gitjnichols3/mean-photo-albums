// src/app/components/albums/album-details/album-details.ts

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { Album } from '../../../models/album.model';
import { AlbumService } from '../../../services/album.service';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private albumService: AlbumService,
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

    console.log('[AlbumDetails] loadAlbum()', id);

    this.albumService.getAlbumById(id).subscribe({
      next: (album) => {
        console.log('[AlbumDetails] Album loaded (param):', album);
        this.album = album;
        console.log('[AlbumDetails] this.album after assign:', this.album);

        this.isLoading = false;

        // Force Angular to notice the new value
        this.cdr.detectChanges();
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

  // trackBy for ngFor (used when we bring the full template back)
  trackEvent(index: number, ev: any): string {
    return ev.eventId || index.toString();
  }
}
