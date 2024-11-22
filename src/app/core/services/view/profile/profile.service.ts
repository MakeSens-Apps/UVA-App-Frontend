import { Injectable } from '@angular/core';
import { UserProgressDSService } from '../../storage/datastore/user-progress-ds.service';
import { SessionService } from '../../session/session.service';
import { UserDSService } from '../../storage/datastore/user-ds.service';
import { DataStore, SortDirection, Predicates } from '@aws-amplify/datastore';
import { SyncMonitorDSService } from '../../storage/datastore/sync-monitor-ds.service';
import { UserProgress, UVA } from 'src/models';
import { UvaDSService } from '../../storage/datastore/uva-ds.service';

export interface LASTUSERPROGRESS {
  seed: number;
  streak: number;
  completedTask: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  sync: SyncMonitorDSService = new SyncMonitorDSService();
  constructor(private session: SessionService) {}

  async lastUserProgress(): Promise<LASTUSERPROGRESS> {
    const userID = (await this.session.getInfo()).userID ?? '';
    const uvaID = (await this.session.getInfo()).uvaID ?? '';

    const value = await DataStore.query(UserProgress, Predicates.ALL, {
      sort: (s) => s.ts(SortDirection.DESCENDING),
      limit: 20,
    });
    console.log(value);

    const progressUser =
      await UserProgressDSService.getLastUserProgress(userID);
    const userDS = await UserDSService.getUserByID(userID);
    const uvaDS = await UvaDSService.getUVAByID(uvaID);
    console.log(uvaDS);
    const valueUVAs = await DataStore.query(UVA, Predicates.ALL, {
      limit: 100,
    });
    console.log(valueUVAs);
    let seed = progressUser?.Seed ?? 0;
    seed = seed + 1;
    await UserProgressDSService.addUserProgress(
      new Date().toISOString(),
      seed,
      seed,
      seed,
      userID,
    );
    console.log(userDS);

    return {
      seed: progressUser?.Seed ?? 0,
      streak: progressUser?.Streak ?? 0,
      completedTask: progressUser?.completedTasks ?? 0,
    };
  }
}
