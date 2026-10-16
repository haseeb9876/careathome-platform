import type { requireAccount } from "@/modules/accounts/session";
export type SectionProps = {
  account: Awaited<ReturnType<typeof requireAccount>>;
  query: Record<string, string | undefined>;
};
