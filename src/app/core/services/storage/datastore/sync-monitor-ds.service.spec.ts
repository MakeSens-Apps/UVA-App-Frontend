import { TestBed } from '@angular/core/testing';

import { SyncMonitorDSService } from './sync-monitor-ds.service';

describe('SyncMonitorDSService', () => {
  let service: SyncMonitorDSService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SyncMonitorDSService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
