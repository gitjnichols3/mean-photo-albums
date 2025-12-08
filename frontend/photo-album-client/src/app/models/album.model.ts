// src/app/models/album.model.ts
export interface Album {
  _id: string;
  ownerId: string;
  title: string;
  description?: string;

  location?: string;

  events: any[];
  createdAt?: string;
  updatedAt?: string;
}

