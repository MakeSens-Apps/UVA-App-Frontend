import { TestBed } from '@angular/core/testing';

import { MoonPhaseAPIService } from './moon-phase-api.service';

describe('MoonPhaseService', () => {
  let service: MoonPhaseAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MoonPhaseAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
