import { TestBed } from '@angular/core/testing';

import { GamificationService } from './gamification.service';

describe('GamificationService', () => {
  let service: GamificationService;
  console.log('Starting GamificationService tests'); // Añade este log

  // Mock data
  const mockUserProgress = {
    id: '1',
    ts: new Date().toISOString(),
    completedTasks: 2,
    Seed: 10,
    Streak: 3,
  };

  const mockEmptyUserProgress = {
    id: '2',
    ts: new Date().toISOString(),
    completedTasks: 0,
    Seed: 0,
    Streak: 0,
    userID: 'userAsD',
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GamificationService],
    });
    service = TestBed.inject(GamificationService);
  });
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  /*
  describe('completeTaskProcess', () => {
    it('should return false if no user progress exists', async () => {
      spyOn(GamificationService, 'getLastUserProgress').and.returnValue(
        Promise.resolve(null),
      );
      console.log('Starting GamificationService tests'); // Añade este log

      const result = await GamificationService.completeTaskProcess(5);
      expect(result).toBeTrue();
    });
    /*
    it('should increment completedTasks when task is completed', async () => {
      spyOn(GamificationService, 'getLastUserProgress').and.returnValue(
        Promise.resolve(mockUserProgress),
      );
      spyOn(GamificationService, 'updateUserProgress').and.returnValue(
        Promise.resolve(mockUserProgress),
      );

      const result = await GamificationService.completeTaskProcess(5);

      expect(result).toBeTrue();
      expect(GamificationService.updateUserProgress).toHaveBeenCalledWith(
        mockUserProgress.id,
        { completedTasks: mockUserProgress.completedTasks + 1 },
      );
    });
    /*
    it('should increment Seed for first completed task', async () => {
      spyOn(GamificationService, 'getLastUserProgress').and.returnValue(
        Promise.resolve(mockEmptyUserProgress),
      );
      spyOn(GamificationService, 'updateUserProgress').and.returnValue(
        Promise.resolve(mockUserProgress),
      );

      const result = await GamificationService.completeTaskProcess(5);

      expect(result).toBeTrue();
      expect(GamificationService.updateUserProgress).toHaveBeenCalledWith(
        mockEmptyUserProgress.id,
        { Seed: mockEmptyUserProgress.Seed + 1 },
      );
    });

    it('should increment Seed and Streak when total tasks are completed', async () => {
      const totalTasks = 3;
      const mockProgress = {
        ...mockUserProgress,
        completedTasks: totalTasks - 1,
      };

      spyOn(GamificationService, 'getLastUserProgress').and.returnValue(
        Promise.resolve(mockProgress),
      );
      spyOn(GamificationService, 'updateUserProgress').and.returnValue(
        Promise.resolve(mockUserProgress),
      );
      spyOn(GamificationService, 'streakBonus').and.returnValue(
        Promise.resolve(true),
      );

      const result = await GamificationService.completeTaskProcess(totalTasks);

      expect(result).toBeTrue();
      expect(GamificationService.updateUserProgress).toHaveBeenCalledWith(
        mockProgress.id,
        { Seed: mockProgress.Seed + 1, Streak: mockProgress.Streak + 1 },
      );
      expect(GamificationService.streakBonus).toHaveBeenCalled();
    });
  });*/
  /*
  describe('recoverStreak', () => {
    it('should return false if user doesnt have enough seeds', async () => {
      const mockProgress = { ...mockUserProgress, Seed: 4 }; // Less than required 5 seeds
      spyOn(GamificationService, 'getLastUserProgress').and.returnValue(
        Promise.resolve(mockProgress),
      );

      const result = await GamificationService.recoverStreak();
      expect(result).toBeFalse();
    });

    it('should recover streak and deduct seeds correctly', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split('T')[0];

      spyOn(GamificationService, 'getLastUserProgress').and.returnValue(
        Promise.resolve(mockUserProgress),
      );
      spyOn(GamificationService, 'getUserProgress').and.returnValue(
        Promise.resolve([mockUserProgress]),
      );
      spyOn(GamificationService, 'updateUserProgress').and.returnValue(
        Promise.resolve(true),
      );

      const result = await GamificationService.recoverStreak();

      expect(result).toBeTrue();
      expect(GamificationService.updateUserProgress).toHaveBeenCalledWith(
        mockUserProgress.id,
        {
          Streak: mockUserProgress.Streak + 1,
          Seed: mockUserProgress.Seed - 5,
        },
      );
    });
  });
  /*
  describe('streakBonus', () => {
    it('should return false if no user progress exists', async () => {
      spyOn(GamificationService, 'getLastUserProgress').and.returnValue(
        Promise.resolve(null),
      );

      const result = await GamificationService.streakBonus();
      expect(result).toBeFalse();
    });

    it('should award bonus seeds when streak is multiple of 7', async () => {
      const mockProgressWithStreak = { ...mockUserProgress, Streak: 7 };
      spyOn(GamificationService, 'getLastUserProgress').and.returnValue(
        Promise.resolve(mockProgressWithStreak),
      );
      spyOn(GamificationService, 'updateUserProgress').and.returnValue(
        Promise.resolve(true),
      );

      const result = await GamificationService.streakBonus();

      expect(result).toBeTrue();
      expect(GamificationService.updateUserProgress).toHaveBeenCalledWith(
        mockProgressWithStreak.id,
        { Seed: mockProgressWithStreak.Seed + 3 },
      );
    });

    it('should not award bonus seeds when streak is not multiple of 7', async () => {
      const mockProgressWithStreak = { ...mockUserProgress, Streak: 6 };
      spyOn(GamificationService, 'getLastUserProgress').and.returnValue(
        Promise.resolve(mockProgressWithStreak),
      );
      spyOn(GamificationService, 'updateUserProgress');

      const result = await GamificationService.streakBonus();

      expect(result).toBeTrue();
      expect(GamificationService.updateUserProgress).not.toHaveBeenCalled();
    });
  });*/
});
