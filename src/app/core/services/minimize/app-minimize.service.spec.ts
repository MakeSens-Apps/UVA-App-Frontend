import { TestBed } from '@angular/core/testing';

import { AppMinimizeService } from './app-minimize.service';

describe('AppMinimizeService', () => {
  let service: AppMinimizeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppMinimizeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
