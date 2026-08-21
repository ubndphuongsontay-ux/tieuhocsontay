"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { transferStudent } from "@/lib/actions";
import type { ClassOption } from "@/lib/queries";

type State = { ok: boolean; error?: string } | null;

export function TransferForm({
  studentId,
  currentClassId,
  classes,
}: {
  studentId: string;
  currentClassId: string | null;
  classes: ClassOption[];
}) {
  async function action(_prev: State, formData: FormData): Promise<State> {
    formData.set("studentId", studentId);
    return transferStudent(formData);
  }

  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="studentId" value={studentId} />
      <label className="field">
        <span>Lớp đến</span>
        <select name="classId" required defaultValue="">
          <option value="" disabled>
            Chọn lớp…
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id} disabled={c.id === currentClassId}>
              {c.campus_name} · {c.name}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Đang chuyển…" : "Chuyển lớp"}
      </Button>
      {state?.ok ? (
        <p className="text-sm font-medium text-success">Đã chuyển chỗ học.</p>
      ) : null}
      {state?.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
