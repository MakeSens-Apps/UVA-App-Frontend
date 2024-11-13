import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('../home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'home/moon-phase',
        loadComponent: () =>
          import('./../../pages/moon-phase/moon-phase.page').then(
            (m) => m.MoonPhasePage,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('../measurement/measurement.page').then(
            (m) => m.MeasurementPage,
          ),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('../historical/historical.page').then((m) => m.HistoricalPage),
      },
      {
        path: 'history/detail',
        loadComponent: () =>
          import(
            '../historical//measurement-detail/measurement-detail.page'
          ).then((m) => m.MeasurementDetailPage),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
