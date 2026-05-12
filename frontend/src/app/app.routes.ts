import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email.component').then(m => m.VerifyEmailComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'albums',
    canActivate: [authGuard],
    loadComponent: () => import('./features/albums/album-list.component').then(m => m.AlbumListComponent),
  },
  {
    path: 'albums/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/stickers/sticker-grid.component').then(m => m.StickerGridComponent),
  },
  {
    path: 'albums/:id/swaps',
    canActivate: [authGuard],
    loadComponent: () => import('./features/swaps/swap-matches.component').then(m => m.SwapMatchesComponent),
  },
  {
    path: 'swap-requests',
    canActivate: [authGuard],
    loadComponent: () => import('./features/swaps/swap-requests.component').then(m => m.SwapRequestsComponent),
  },
  {
    path: 'admin/templates',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-templates.component').then(m => m.AdminTemplatesComponent),
  },
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-users.component').then(m => m.AdminUsersComponent),
  },
  { path: '**', redirectTo: '' },
];
