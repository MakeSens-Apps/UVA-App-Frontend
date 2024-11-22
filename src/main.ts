import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';
import { Amplify } from 'aws-amplify';
import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { DataStore } from '@aws-amplify/datastore';
import { ConflictHandler } from '@aws-amplify/datastore';

import config from './amplifyconfiguration.json';

// Configurar Amplify sin DataStore
Amplify.configure(config);

// Configurar DataStore por separado
DataStore.configure({
  conflictHandler: async (conflict) => {
    const { localModel, remoteModel } = conflict;
    console.log('Conflicto detectado:', conflict);

    // Prioriza siempre el modelo local
    return localModel;
  },
  errorHandler: (error) => {
    console.error('Error en DataStore:', error);
  },
});

void bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
