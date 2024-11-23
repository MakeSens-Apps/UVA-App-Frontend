import { TestBed } from '@angular/core/testing';

import { UserProgressDSService } from './user-progress-ds.service';

describe('UserProgressDSService', () => {
  let service: UserProgressDSService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserProgressDSService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
