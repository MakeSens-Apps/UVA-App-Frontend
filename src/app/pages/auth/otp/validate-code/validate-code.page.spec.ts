import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ValidateCodePage } from './validate-code.page';

describe('ValidateCodePage', () => {
  let component: ValidateCodePage;
  let fixture: ComponentFixture<ValidateCodePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ValidateCodePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
