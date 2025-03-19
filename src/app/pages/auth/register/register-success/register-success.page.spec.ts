import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterSuccessPage } from './register-success.page';

describe('RegisterSuccessPage', () => {
  let component: RegisterSuccessPage;
  let fixture: ComponentFixture<RegisterSuccessPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterSuccessPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
