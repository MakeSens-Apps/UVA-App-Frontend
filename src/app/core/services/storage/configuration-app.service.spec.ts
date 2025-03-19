import { TestBed } from '@angular/core/testing';

import { ConfigurationAppService } from './configuration-app.service';

describe('ConfigurationAppService', () => {
  let service: ConfigurationAppService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfigurationAppService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
