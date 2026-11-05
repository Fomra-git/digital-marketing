import { z } from "zod";
import { id, optionalId, optionalText } from "./common";

export const dailyReportSchema = z
  .object({
    company_id: id,
    project_id: optionalId,
    report_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    completed_activities: optionalText(5000),
    work_in_progress: optionalText(5000),
    pending_activities: optionalText(5000),
    challenges: optionalText(5000),
    tomorrow_plan: optionalText(5000),
    hours_worked: z
      .string()
      .trim()
      .refine(
        (v) =>
          v === "" ||
          (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 24),
        "Between 0 and 24",
      ),
    submit: z.boolean(),
  })
  .refine(
    (v) =>
      !v.submit ||
      v.completed_activities.trim().length > 0 ||
      v.work_in_progress.trim().length > 0,
    {
      message: "Add what you completed or worked on before submitting",
      path: ["completed_activities"],
    },
  );
export type DailyReportInput = z.input<typeof dailyReportSchema>;
