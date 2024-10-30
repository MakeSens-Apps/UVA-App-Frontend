import { TestBed } from '@angular/core/testing';

import { UserProgressAPIService } from './user-progress-api.service';

describe('UserProgressService', () => {
  let service: UserProgressAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserProgressAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
