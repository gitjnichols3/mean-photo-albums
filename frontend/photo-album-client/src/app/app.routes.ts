// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

// Application routes for authentication, album management,
// and the public read-only shared album view
export const routes: Routes = [

  // ---------- PUBLIC ROUTES ----------
  // These routes do NOT require a logged-in user

  {
    path: 'login',
    // Main entry point for returning users
    loadComponent: () =>
      import('./components/auth/login/login').then(m => m.Login)
  },

  {
    path: 'register',
    // Account creation for new users
    loadComponent: () =>
      import('./components/auth/register/register').then(m => m.RegisterComponent)
  },

  {
    path: 'share/:slug',
    // Public, read-only view of a shared album accessed by its share slug
    loadComponent: () =>
      import('./components/public/share-album/share-album.component').then(
        (m) => m.ShareAlbumComponent
      ),
  },

  // ---------- PROTECTED ROUTES ----------
  // All routes below require authentication via AuthGuard

  {
    path: 'albums',
    // Logged-in user's main dashboard (album list)
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/albums/album-list/album-list')
        .then(m => m.AlbumList)
  },

  {
    path: 'albums/create',
    // Form for creating a new album
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/albums/album-create/album-create')
        .then(m => m.AlbumCreateComponent)
  },

  {
    path: 'albums/:id',
    // Album details page with timeline, events, and photos
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/albums/album-details/album-details')
        .then(m => m.AlbumDetailsComponent)
  },

  // ---------- DEFAULT / FALLBACK ----------
  // Any unknown route or root path routes back to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
