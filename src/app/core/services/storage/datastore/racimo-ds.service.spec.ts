import { TestBed } from '@angular/core/testing';

import { RacimoDSService } from './racimo-ds.service';

describe('RacimoDSService', () => {
  let service: RacimoDSService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RacimoDSService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
