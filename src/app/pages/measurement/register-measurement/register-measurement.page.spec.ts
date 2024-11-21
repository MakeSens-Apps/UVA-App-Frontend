import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterMeasurementPage } from './register-measurement.page';

describe('RegisterMeasurementPage', () => {
  let component: RegisterMeasurementPage;
  let fixture: ComponentFixture<RegisterMeasurementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterMeasurementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
