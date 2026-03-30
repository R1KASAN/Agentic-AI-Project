import { redirect } from "next/navigation";

export const metadata = { title: "Teacher Recommendations" };

export default async function RecommendationsPage() {
  redirect("/teacher/classes");
}
