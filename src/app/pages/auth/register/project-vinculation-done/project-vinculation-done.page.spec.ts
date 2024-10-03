import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectVinculationDonePage } from './project-vinculation-done.page';

describe('ProjectVinculationDonePage', () => {
  let component: ProjectVinculationDonePage;
  let fixture: ComponentFixture<ProjectVinculationDonePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectVinculationDonePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
