import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Nhập tài khoản")
    .max(32)
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, "Tài khoản chỉ gồm chữ và số, bắt đầu bằng chữ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(3, "Nhập tên nhiệm vụ").max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  ownerId: z.string().uuid("Chọn người chủ trì"),
  collaboratorIds: z.array(z.string().uuid()).optional().default([]),
  campusId: z.string().uuid().optional().nullable(),
  domain: z.string().trim().max(80).optional().nullable(),
  startsOn: z.string().optional().nullable(),
  dueOn: z.string().min(1, "Chọn hạn hoàn thành"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  deliverable: z.string().trim().max(500).optional().nullable(),
});

export const taskProgressSchema = z.object({
  taskId: z.string().uuid(),
  progress: z.coerce.number().int().min(0).max(100),
  note: z.string().trim().min(1, "Nhập nội dung đã làm").max(2000),
  blocked: z.boolean().optional().default(false),
});

export const taskCommentSchema = z.object({
  taskId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export const taskDecisionSchema = z.object({
  taskId: z.string().uuid(),
  decision: z.enum(["approved", "changes_requested"]),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const attendanceSaveSchema = z.object({
  classId: z.string().uuid(),
  attendedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sessionKind: z.enum(["sang", "chieu"]),
  submit: z.boolean().optional().default(false),
  records: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: z.enum(["present", "excused", "unexcused", "late", "early_leave"]),
      reason: z.string().trim().max(300).optional().nullable(),
      note: z.string().trim().max(300).optional().nullable(),
    })
  ),
});

export const homeroomAssignSchema = z.object({
  classId: z.string().uuid(),
  staffId: z.string().uuid().nullable().optional(),
});

export const subjectAssignSchema = z.object({
  classId: z.string().uuid(),
  staffId: z.string().uuid("Chọn giáo viên"),
  subject: z.string().trim().min(2, "Chọn môn giảng dạy").max(80),
});

export const assignmentIdSchema = z.object({
  assignmentId: z.string().uuid(),
  classId: z.string().uuid(),
});

export const studentUpdateSchema = z.object({
  studentId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  dob: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  ethnicity: z.string().trim().max(40).optional().nullable(),
  nationalId: z.string().trim().max(20).optional().nullable(),
  bgdCode: z.string().trim().max(40).optional().nullable(),
});

export const studentContactUpsertSchema = z.object({
  studentId: z.string().uuid(),
  contactId: z.string().uuid().optional().nullable(),
  relation: z.enum(["me", "cha", "khac"]),
  fullName: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
});

export const staffUpdateSchema = z.object({
  staffId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  dob: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  ethnicity: z.string().trim().max(40).optional().nullable(),
  nationalId: z.string().trim().max(20).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  educationLevel: z.string().trim().max(80).optional().nullable(),
  professionalQualification: z.string().trim().max(80).optional().nullable(),
  itLevel: z.string().trim().max(80).optional().nullable(),
  foreignLanguageLevel: z.string().trim().max(80).optional().nullable(),
  politicalTheoryLevel: z.string().trim().max(80).optional().nullable(),
  employmentKind: z.string().optional().nullable(),
  partyMember: z.string().optional().default("unknown"),
});

export const staffCreateSchema = staffUpdateSchema.omit({ staffId: true }).extend({
  campusId: z.string().uuid("Chọn phân hiệu"),
});

export const studentCreateSchema = studentUpdateSchema.omit({ studentId: true }).extend({
  classId: z.string().uuid("Chọn lớp đang học"),
  contactRelation: z.enum(["me", "cha", "khac"]).optional().nullable(),
  contactName: z.string().trim().max(120).optional().nullable(),
  contactPhone: z.string().trim().max(20).optional().nullable(),
});
