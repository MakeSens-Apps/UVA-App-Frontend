import { TestBed } from '@angular/core/testing';

import { RacimoAPIService } from './racimo-api.service';

describe('RacimoAPIService', () => {
  let service: RacimoAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RacimoAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
