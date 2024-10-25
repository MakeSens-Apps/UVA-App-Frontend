import { TestBed } from '@angular/core/testing';

import { UvaAPIService } from './uva-api.service';

describe('UvaService', () => {
  let service: UvaAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UvaAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
