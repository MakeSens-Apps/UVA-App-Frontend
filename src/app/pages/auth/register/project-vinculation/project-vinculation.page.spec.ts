import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectVinculationPage } from './project-vinculation.page';

describe('ProjectVinculationPage', () => {
  let component: ProjectVinculationPage;
  let fixture: ComponentFixture<ProjectVinculationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectVinculationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
