// src/app/models/album.model.ts
export interface Album {
  _id: string;
  ownerId: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  events: any[]; // or a proper Event[] later
}
