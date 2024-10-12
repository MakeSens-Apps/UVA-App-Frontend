import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'app',
    loadChildren: () => import('./pages/tabs/tabs.routes').then((m) => m.routes),
  }, 
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.page').then( m => m.LoginPage)
  },
  {
    path: '',
    loadComponent: () => import('./pages/splash-animation/splash-animation.page').then( m => m.SplashAnimationPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register/register.page').then( m => m.RegisterPage)
  },
  {
    path: 'otp/:type/:phone',
    loadComponent: () => import('./pages/auth/otp/otp.page').then( m => m.OtpPage)
  },
  {
    path: 'pre-register',
    loadComponent: () => import('./pages/auth/register/pre-register/pre-register.page').then( m => m.PreRegisterPage)
  },
  {
    path: 'register/set-phone-register',
    loadComponent: () => import('./pages/auth/register/set-phone-register/set-phone-register.page').then( m => m.SetPhoneRegisterPage)
  },
  {
    path: 'otp/:type/:phone/validate-code',
    loadComponent: () => import('./pages/auth/otp/validate-code/validate-code.page').then( m => m.ValidateCodePage)
  },
  {
    path: 'register/project-vinculation',
    loadComponent: () => import('./pages/auth/register/project-vinculation/project-vinculation.page').then( m => m.ProjectVinculationPage)
  },
  {
    path: 'register/validate-project',
    loadComponent: () => import('./pages/auth/register/validate-project/validate-project.page').then( m => m.ValidateProjectPage)
  },
  {
    path: 'register/project-vinculation-done',
    loadComponent: () => import('./pages/auth/register/project-vinculation-done/project-vinculation-done.page').then( m => m.ProjectVinculationDonePage)
  },
  {
    path: 'register/register-project-form',
    loadComponent: () => import('./pages/auth/register/register-project-form/register-project-form.page').then( m => m.RegisterProjectFormPage)
  },
  {
    path: 'register/register-completed',
    loadComponent: () => import('./pages/auth/register/register-completed/register-completed.page').then( m => m.RegisterCompletedPage)
  },
 
];
