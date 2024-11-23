import { TestBed } from '@angular/core/testing';

import { MeasurementDSService } from './measurement-ds.service';

describe('MeasurementDSService', () => {
  let service: MeasurementDSService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MeasurementDSService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
