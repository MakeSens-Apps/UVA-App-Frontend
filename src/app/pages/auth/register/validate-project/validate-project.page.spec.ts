import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValidateProjectPage } from './validate-project.page';

describe('ValidateProjectPage', () => {
  let component: ValidateProjectPage;
  let fixture: ComponentFixture<ValidateProjectPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidateProjectPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
