import { TestBed } from '@angular/core/testing';

import { UserDSService } from './user-ds.service';

describe('UserDSService', () => {
  let service: UserDSService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserDSService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
