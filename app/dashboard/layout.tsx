import { ReactNode } from "react";
import RoleGuard from "@/components/RoleGuard";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <RoleGuard allowedRole="client">
      {children}
    </RoleGuard>
  );
}