import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterProjectFormPage } from './register-project-form.page';

describe('RegisterProjectFormPage', () => {
  let component: RegisterProjectFormPage;
  let fixture: ComponentFixture<RegisterProjectFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterProjectFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
