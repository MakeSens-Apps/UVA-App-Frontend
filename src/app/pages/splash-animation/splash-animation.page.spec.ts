import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplashAnimationPage } from './splash-animation.page';

describe('SplashAnimationPage', () => {
  let component: SplashAnimationPage;
  let fixture: ComponentFixture<SplashAnimationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SplashAnimationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
