// src/app/models/photo.model.ts
export interface Photo {
  _id: string;
  albumId: string;
  eventId?: string | null;
  photographerId: string;
  originalUrl: string;
  thumbnailUrl?: string;
  uploadedAt?: string;
  takenAt?: string | null;
}
