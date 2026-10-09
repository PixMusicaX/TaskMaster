// Who the server actions think is signed in during a test (see the "@/lib/current-user" mock
// in tests/setup.ts). Both users exist in the test database.
export const TEST_USER_ID = "test-user";
export const OTHER_USER_ID = "other-user";

let current: string = TEST_USER_ID;

export const currentUserId = () => current;

export function actAs(userId: string) {
  current = userId;
}
