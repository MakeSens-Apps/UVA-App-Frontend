import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AppMinimizeService } from '@app/core/services/minimize/app-minimize.service';
import { AppUsageService } from '@app/core/services/view/app-usage.service';
import { DataStore, syncExpression } from '@aws-amplify/datastore';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { configureAutoTrack } from 'aws-amplify/analytics';
import { filter } from 'rxjs/operators';
import { AppUsageEvent, GamificationEvent } from 'src/models';
import { ConfigurationAppService } from './core/services/storage/configuration-app.service';
import { SyncMonitorDSService } from './core/services/storage/datastore/sync-monitor-ds.service';
import { GamificationService } from './core/services/view/gamification/gamification.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, RouterModule],
})
export class AppComponent {
  /**
   * Creates an instance of AppComponent.
   * @memberof AppComponent
   * @param {ConfigurationAppService} configuration Configuretion Service to load branding/Colors
   * @param {Platform} platform -For Wait for the platform to load
   * @param router
   * @param appUsageService
   * @param {AppMinimizeService} appMinimizeService - For initialize listener of the back button and can minimize app.
   */
  constructor(
    private configuration: ConfigurationAppService,
    private platform: Platform,
    private appMinimizeService: AppMinimizeService,
    private router: Router,
    private appUsageService: AppUsageService,
    private syncMonitorService: SyncMonitorDSService,
  ) {
    // Configure DataStore sync expressions
    DataStore.configure({
      syncExpressions: [
        syncExpression(GamificationEvent, () => {
          return (ge) => ge.isUnclean.eq(true);
        }),
        syncExpression(AppUsageEvent, () => {
          return (ae) => ae['id'].eq(''); // Never sync AppUsageEvent data from cloud
        }),
      ],
    });

    void this.configuration.loadBranding();
    platform
      .ready()
      .then(() => {
        SyncMonitorDSService.subscribeToSync();
        appMinimizeService.initializeBackButtonHandler();
        this.initializeNavigationTracking();
        this.initializeDebugUtilities();
      })
      .catch((err) => {
        console.error(err);
      });
    this.initAutoTrack();
  }

  /**
   * Configure track analitics
   * @memberof AppComponent
   */
  private initAutoTrack(): void {
    configureAutoTrack({
      enable: true,
      type: 'session',
      options: {
        attributes: {
          customizableField: 'attr',
        },
      },
    });
    configureAutoTrack({
      enable: true,
      type: 'pageView',
      options: {
        attributes: {
          customizableField: 'attr',
        },

        eventName: 'pageView',
        appType: 'singlePage',

        urlProvider: () => {
          return window.location.origin + window.location.pathname;
        },
      },
    });
  }

  /**
   * Initialize navigation tracking for app usage monitoring
   * @private
   */
  private initializeNavigationTracking(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const screenName = this.getScreenNameFromUrl(event.urlAfterRedirects);
        void this.appUsageService.trackNavigation(screenName);
      });
  }

  /**
   * Extract screen name from URL path
   * @param url The URL path
   * @returns Screen name for tracking
   * @private
   */
  private getScreenNameFromUrl(url: string): string {
    // Remove leading slash and query parameters
    const path = url.split('?')[0].split('#')[0].replace(/^\//, '');

    // Handle empty path (home)
    if (!path || path === 'tabs/home') {
      return 'home';
    }

    // Extract the last meaningful segment
    const segments = path
      .split('/')
      .filter((segment) => segment && segment !== 'tabs');
    return segments.length > 0 ? segments[segments.length - 1] : 'unknown';
  }

  /**
   * Initialize debug utilities for development (DEVELOPMENT ONLY)
   * @private
   */
  private initializeDebugUtilities(): void {
    // Only expose debug utilities in development mode
    if (!environment.production) {
      (window as any).debugGamification = {
        reset: () => GamificationService.debugResetDailyProgress(),
        simulate: (tasks: number = 1, total: number = 3) =>
          GamificationService.debugSimulateTaskCompletion(tasks, total),
        addSeeds: (amount: number) => GamificationService.debugAddSeeds(amount),
        show: () => GamificationService.debugShowCurrentProgress(),
        runTests: () => GamificationService.debugRunAllTests(),
        cleanup: () => GamificationService.debugCleanup(),
      };

      console.log('🧪 DEBUG: Gamification debug utilities loaded!');
      console.log('Available commands:');
      console.log('  debugGamification.reset() - Reset daily progress to 0');
      console.log('  debugGamification.simulate(tasks, total) - Simulate task completion');
      console.log('  debugGamification.addSeeds(amount) - Add seeds directly');
      console.log('  debugGamification.show() - Show current progress');
      console.log('  debugGamification.runTests() - Run automated test suite');
      console.log('  debugGamification.cleanup() - Cleanup test data');
    }
  }
}
