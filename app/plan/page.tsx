import { redirect } from "next/navigation";

export default function PlanPage() {
  redirect("/profile?view=plan");
}
