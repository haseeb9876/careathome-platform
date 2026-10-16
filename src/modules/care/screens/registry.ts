import { BookingsSection } from "./bookings";
import { RecordsSection } from "./records";
import { ReportsSection } from "./reports";
import { PaymentsSection } from "./payments";
import { ReviewsSection } from "./reviews";
import { SupportSection } from "./support";
import { NotificationsSection } from "./notifications";
import { ProfileSection } from "./profile";
import { ScheduleSection } from "./schedule";
import { SettingsSection } from "./settings";
import { ProvidersSection } from "./providers";
import { UsersSection } from "./users";
import { ServicesSection } from "./services";
import { AuditSection } from "./audit";
import type { ReactNode } from "react";
import type { SectionProps } from "./types";
// Navigation visibility is supplementary; database RLS remains authoritative.
export const dashboardSections: Record<
  string,
  {
    roles: readonly import("../types").Profile["role"][];
    render: (props: SectionProps) => Promise<ReactNode>;
  }
> = {
  bookings: {
    roles: ["patient", "provider", "admin"],
    render: BookingsSection,
  },
  records: { roles: ["patient", "provider"], render: RecordsSection },
  reports: { roles: ["patient", "provider"], render: ReportsSection },
  payments: { roles: ["patient", "admin"], render: PaymentsSection },
  reviews: { roles: ["patient", "provider", "admin"], render: ReviewsSection },
  support: { roles: ["patient", "provider", "admin"], render: SupportSection },
  notifications: {
    roles: ["patient", "provider", "admin"],
    render: NotificationsSection,
  },
  profile: { roles: ["patient", "provider"], render: ProfileSection },
  schedule: { roles: ["provider"], render: ScheduleSection },
  settings: {
    roles: ["patient", "provider", "admin"],
    render: SettingsSection,
  },
  providers: { roles: ["admin"], render: ProvidersSection },
  users: { roles: ["admin"], render: UsersSection },
  services: { roles: ["admin"], render: ServicesSection },
  audit: { roles: ["admin"], render: AuditSection },
};
