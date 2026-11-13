import { z } from "zod";

// Os mesmos valores do enum public.app_role do banco.
export const appRoleSchema = z.enum(["admin", "client"]);

export type AppRole = z.infer<typeof appRoleSchema>;

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole;
  fullName: string;
};
