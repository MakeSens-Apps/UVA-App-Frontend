import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TestUsersService {
  /**
   * List of test user phone numbers.
   */
  private testUsers: string[] = [
    '+570000000000',
    '+573000000000',
    '+573000000001',
    '+573000000002',
    '+573000000003',

    // ...add more test users as needed
  ];
  /**
   * Constructor
   */
  constructor() {}

  /**
   * Checks if the given phone number is in the list of test users.
   * @param {string} phoneNumber - The phone number to check.
   * @returns {boolean} True if the phone number is a test user, false otherwise.
   */
  isTestUser(phoneNumber: string): boolean {
    return this.testUsers.includes(phoneNumber);
  }
}
