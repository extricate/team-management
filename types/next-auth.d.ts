import type { UserRole } from "@/lib/db/schema";
import "next-auth";
import "next-auth/adapters";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      organisationId: string | null;
      defaultOrganisationId: string | null;
      mustChangePassword: boolean;
    };
  }

  interface User {
    role: UserRole;
    organisationId?: string | null;
    defaultOrganisationId?: string | null;
    mustChangePassword?: boolean;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: UserRole;
    organisationId?: string | null;
    defaultOrganisationId?: string | null;
    mustChangePassword?: boolean;
  }
}
