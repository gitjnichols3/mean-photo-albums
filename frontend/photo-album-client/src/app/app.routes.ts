// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/auth/login/login').then(m => m.Login)
  },
  {
    path: 'albums',
    loadComponent: () =>
      import('./components/albums/album-list/album-list').then(m => m.AlbumList)
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
