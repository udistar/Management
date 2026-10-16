/** Owner mailbox. UI allowlist only — table access still depends on RLS. */
export const ALLOWED_OWNER_EMAIL = "01042870788sm@gmail.com";

export function isAllowedOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === ALLOWED_OWNER_EMAIL.toLowerCase();
}
