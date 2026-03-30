import { redirect } from "next/navigation";

/**
 * Root page — proxy handles the redirect to the appropriate
 * role-specific home page. This fallback redirect is a safety net.
 */
export default function HomePage() {
  redirect("/login");
}
