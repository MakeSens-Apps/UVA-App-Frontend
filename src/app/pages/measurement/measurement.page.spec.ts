import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeasurementPage } from './measurement.page';

describe('MeasurementPage', () => {
  let component: MeasurementPage;
  let fixture: ComponentFixture<MeasurementPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(MeasurementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
