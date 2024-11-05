import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoonPhasePage } from './moon-phase.page';

describe('MoonPhasePage', () => {
  let component: MoonPhasePage;
  let fixture: ComponentFixture<MoonPhasePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MoonPhasePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
