import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$: Observable<number> =
    this.unreadCountSubject.asObservable();

  /**
   *
   */
  constructor() {}

  /**
   * Updates the unread notification count.
   * @param count - The new unread count.
   */
  updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }

  /**
   * Gets the current unread notification count.
   * @returns The current unread count.
   */
  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /**
   * Checks if there are any unread notifications.
   * @returns True if there are unread notifications, false otherwise.
   */
  hasUnreadNotifications(): boolean {
    return this.unreadCountSubject.value > 0;
  }
}
