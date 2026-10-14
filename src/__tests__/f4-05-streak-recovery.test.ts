/**
 * F4-05 (#60) — with the station disabled the streak breaks as today, but the app does not
 * propose recovering it (P34): recalculateDailyProgress skips the "Recupera tu racha" alert.
 */

jest.mock('@aws-amplify/datastore', () => ({
  DataStore: { query: jest.fn(), save: jest.fn() },
  Predicates: { ALL: {} },
  SortDirection: { ASCENDING: 'ASCENDING', DESCENDING: 'DESCENDING' },
}));
jest.mock('@/data/models', () => ({
  UserProgress: function UserProgress() {},
}));
jest.mock('@/data/session/session', () =>
  jest.fn().mockImplementation(() => ({ getInfo: jest.fn() })),
);
jest.mock('@/domain/gamification/gamification-alerts', () => ({
  GamificationAlertsService: {
    createStreakRecoveryAlert: jest.fn(() => Promise.resolve()),
    createStreakLostAlert: jest.fn(() => Promise.resolve()),
  },
}));

/* eslint-disable import/first */
import { UserProgressDSService } from '@/data/datastore/user-progress-ds';
import { GamificationAlertsService } from '@/domain/gamification/gamification-alerts';
import type { UserProgress } from '@/data/models';
/* eslint-enable import/first */

describe('recalculateDailyProgress — streak recovery proposal (F4-05)', () => {
  let createSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    jest
      .spyOn(UserProgressDSService, 'getUserProgress')
      .mockResolvedValue([
        { ts: yesterday.toISOString(), completedTasks: 0, Streak: 4, Seed: 9 },
      ] as unknown as UserProgress[]);
    jest
      .spyOn(
        UserProgressDSService as unknown as {
          handleMilestoneAssignment: () => Promise<number>;
        },
        'handleMilestoneAssignment',
      )
      .mockResolvedValue(9);
    createSpy = jest
      .spyOn(UserProgressDSService, 'createUserProgress')
      .mockResolvedValue({} as UserProgress);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('default (station enabled): breaks the streak and proposes recovering it', async () => {
    await UserProgressDSService.recalculateDailyProgress();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ Streak: 0, completedTasks: 0 }),
    );
    expect(
      GamificationAlertsService.createStreakRecoveryAlert,
    ).toHaveBeenCalledTimes(1);
  });

  it('station disabled: breaks the streak the same way, without proposing recovery', async () => {
    await UserProgressDSService.recalculateDailyProgress({
      proposeStreakRecovery: false,
    });
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ Streak: 0, completedTasks: 0 }),
    );
    expect(
      GamificationAlertsService.createStreakRecoveryAlert,
    ).not.toHaveBeenCalled();
  });
});
