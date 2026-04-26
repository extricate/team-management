import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { positionAssignments, employees } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { formatFullName } from "@/lib/utils";
import { EditPositieForm } from "./EditPositieForm";

export default async function EditPositiePage({ params }: { params: { id: string; assignmentId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const emp = await db.query.employees.findFirst({
    where: and(eq(employees.id, params.id), isNull(employees.deletedAt)),
  });
  if (!emp) notFound();

  const assignment = await db.query.positionAssignments.findFirst({
    where: eq(positionAssignments.id, params.assignmentId),
    with: { position: { with: { team: true } } },
  });
  if (!assignment || assignment.employeeId !== params.id) notFound();

  return (
    <EditPositieForm
      assignment={assignment}
      employeeId={emp.id}
      employeeName={formatFullName(emp)}
      positionLabel={`${assignment.position.type}${assignment.position.positionCode ? ` (${assignment.position.positionCode})` : ""} — ${assignment.position.team.name}`}
    />
  );
}
