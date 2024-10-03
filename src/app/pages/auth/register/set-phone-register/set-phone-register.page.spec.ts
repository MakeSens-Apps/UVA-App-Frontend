import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SetPhoneRegisterPage } from './set-phone-register.page';

describe('SetPhoneRegisterPage', () => {
  let component: SetPhoneRegisterPage;
  let fixture: ComponentFixture<SetPhoneRegisterPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SetPhoneRegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
