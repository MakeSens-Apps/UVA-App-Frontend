import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterCompletedPage } from './register-completed.page';

describe('RegisterCompletedPage', () => {
  let component: RegisterCompletedPage;
  let fixture: ComponentFixture<RegisterCompletedPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterCompletedPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
