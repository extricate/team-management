import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = { title: "Toewijzing bewerken – Teambeheer" };
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { positionAssignments, employees } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { formatFullName } from "@/lib/utils";
import { EditPositieForm } from "./EditPositieForm";

export default async function EditPositiePage({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/inloggen");

  const emp = await db.query.employees.findFirst({
    where: and(eq(employees.id, id), isNull(employees.deletedAt)),
  });
  if (!emp) notFound();

  const assignment = await db.query.positionAssignments.findFirst({
    where: eq(positionAssignments.id, assignmentId),
    with: { position: { with: { team: true } } },
  });
  if (!assignment || assignment.employeeId !== id) notFound();

  return (
    <EditPositieForm
      assignment={assignment}
      employeeId={emp.id}
      employeeName={formatFullName(emp)}
      positionLabel={`${assignment.position.type}${assignment.position.positionCode ? ` (${assignment.position.positionCode})` : ""} — ${assignment.position.team.name}`}
    />
  );
}
