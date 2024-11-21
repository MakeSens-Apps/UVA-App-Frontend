/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { MeasurementService } from './measurement.service';

describe('Service: Measurement.service', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MeasurementService],
    });
  });

  it('should ...', inject(
    [MeasurementService],
    (service: MeasurementService) => {
      expect(service).toBeTruthy();
    },
  ));
});
