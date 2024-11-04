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
          import('../home/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('../measurement/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('../historical/tab3.page').then((m) => m.Tab3Page),
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
