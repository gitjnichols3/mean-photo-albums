// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // ---------- PUBLIC ROUTES ----------
  {
    path: 'login',
    loadComponent: () =>
      import('./components/auth/login/login').then(m => m.Login)
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./components/auth/register/register').then(m => m.RegisterComponent)
  },

  {
    path: 'share/:slug',
    loadComponent: () =>
      import('./components/public/share-album/share-album.component').then(
        (m) => m.ShareAlbumComponent
      ),
  },

  // ---------- PROTECTED ROUTES ----------
  {
    path: 'albums',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/albums/album-list/album-list')
        .then(m => m.AlbumList)
  },
  {
    path: 'albums/create',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/albums/album-create/album-create')
        .then(m => m.AlbumCreateComponent)
  },
  {
    path: 'albums/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/albums/album-details/album-details')
        .then(m => m.AlbumDetailsComponent)
  },

  // ---------- DEFAULT / FALLBACK ----------
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
