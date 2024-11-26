import { TestBed } from '@angular/core/testing';

import { UvaDSService } from './uva-ds.service';

describe('UvaDSService', () => {
  let service: UvaDSService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UvaDSService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
