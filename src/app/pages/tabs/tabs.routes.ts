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
