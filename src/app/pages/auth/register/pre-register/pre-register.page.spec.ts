import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreRegisterPage } from './pre-register.page';

describe('PreRegisterPage', () => {
  let component: PreRegisterPage;
  let fixture: ComponentFixture<PreRegisterPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PreRegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
