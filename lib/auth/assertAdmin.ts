import "server-only";
import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth/session";

export const assertAdmin = async () => {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    redirect("/login");
  }

  if (!session.isAdmin) {
    redirect("/trade");
  }

  return session;
};
