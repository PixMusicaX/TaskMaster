// The demo: a throwaway planner for trying the app without an account (safe to import from the
// client). A demo player is an ordinary account under a made-up address in this domain, which is
// how the server recognises one; it is deleted when the visitor leaves or the session runs out.
export const DEMO_EMAIL_DOMAIN = "demo.taskmaster.invalid";
export const DEMO_NAME = "Demo Hero";
// How long a demo lasts if the visitor just walks away
export const DEMO_HOURS = 2;

export const isDemoEmail = (email: string | null | undefined) => !!email && email.endsWith(`@${DEMO_EMAIL_DOMAIN}`);
