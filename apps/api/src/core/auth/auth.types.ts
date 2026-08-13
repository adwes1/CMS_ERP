export type AuthenticatedUser = {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  realm_access?: { roles?: string[] };
};

