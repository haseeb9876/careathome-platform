import { notFound } from "next/navigation";
import { requireAccount } from "@/modules/accounts/session";
import { CareSections } from "@/modules/care/sections";
import { AdminSections } from "@/modules/care/admin-sections";
import { ProfileSections } from "@/modules/care/profile-sections";
const access: Record<string, string[]> = {
  bookings: ["patient", "provider", "admin"],
  records: ["patient", "provider"],
  reports: ["patient", "provider"],
  payments: ["patient", "admin"],
  reviews: ["patient", "provider", "admin"],
  support: ["patient", "provider", "admin"],
  notifications: ["patient", "provider", "admin"],
  profile: ["patient", "provider"],
  schedule: ["provider"],
  settings: ["patient", "provider", "admin"],
  providers: ["admin"],
  users: ["admin"],
  services: ["admin"],
  audit: ["admin"],
};
export default async function Section({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { section } = await params;
  const query = await searchParams;
  const account = await requireAccount();
  if (!access[section]?.includes(account.profile.role)) notFound();
  return (
    <>
      {query.message && (
        <p className="notice" role="status">
          {query.message}
        </p>
      )}
      {query.error && (
        <p className="notice error" role="alert">
          {query.error}
        </p>
      )}
      {["providers", "users", "services", "audit"].includes(section) ? (
        <AdminSections section={section} account={account} query={query} />
      ) : ["profile", "schedule", "settings"].includes(section) ? (
        <ProfileSections section={section} account={account} />
      ) : (
        <CareSections section={section} account={account} query={query} />
      )}
    </>
  );
}
