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
  {
    path: 'albums/create',
    loadComponent: () =>
      import('./components/albums/album-create/album-create')
        .then(m => m.AlbumCreateComponent)
  },
  {
    path: 'albums/:id',
    loadComponent: () =>
      import('./components/albums/album-details/album-details')
        .then(m => m.AlbumDetailsComponent)
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
