import { TestBed } from '@angular/core/testing';

import { SetupRacimoService } from './setup-racimo.service';

describe('SetupRacimoService', () => {
  let service: SetupRacimoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SetupRacimoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
