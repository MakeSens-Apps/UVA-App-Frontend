import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MeasurementDetailPage } from './measurement-detail.page';

describe('MeasurementDetailPage', () => {
  let component: MeasurementDetailPage;
  let fixture: ComponentFixture<MeasurementDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MeasurementDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
