export type RoleName =
  | "principal"
  | "vice_principal"
  | "department_head"
  | "department_deputy"
  | "teacher"
  | "homeroom_teacher"
  | "staff"
  | "campus_coordinator"
  | "system_admin";

export type RoleScope = {
  id?: string;
  role: RoleName;
  campus_id?: string | null;
  grade?: number | null;
  class_id?: string | null;
  department_id?: string | null;
  domain?: string | null;
};

export type Access = {
  profileId: string;
  name?: string;
  username?: string;
  email?: string;
  roles: RoleName[];
  scopes: RoleScope[];
  schoolWide: boolean;
  campusIds: string[];
  classIds: string[];
};

export function hasRole(access: Access, roles: RoleName[]) {
  return access.roles.some((r) => roles.includes(r));
}

export function canSeeCampus(access: Access, campusId: string) {
  if (access.schoolWide) return true;
  return access.campusIds.includes(campusId);
}

export function isClassScopedOnly(access: Access) {
  if (access.schoolWide) return false;
  const broader = access.scopes.some(
    (s) =>
      !s.class_id &&
      (s.role === "vice_principal" ||
        s.role === "campus_coordinator" ||
        s.role === "department_head" ||
        s.role === "staff")
  );
  return !broader && access.classIds.length > 0;
}

export function canSeeStaff(access: Access) {
  return hasRole(access, [
    "principal",
    "system_admin",
    "vice_principal",
    "campus_coordinator",
    "department_head",
    "department_deputy",
  ]);
}

export function canSeeClass(access: Access, classId: string, campusId: string) {
  if (access.schoolWide) return true;
  if (access.classIds.includes(classId)) return true;
  if (
    hasRole(access, ["vice_principal", "campus_coordinator", "department_head"]) &&
    access.campusIds.includes(campusId)
  ) {
    return true;
  }
  return false;
}

export function canEditAttendance(access: Access, classId: string, campusId: string) {
  if (!canSeeClass(access, classId, campusId)) return false;
  if (hasRole(access, ["principal", "vice_principal", "campus_coordinator"])) return true;
  return hasRole(access, ["homeroom_teacher"]) && access.classIds.includes(classId);
}

export function classListMode(access: Access): "all" | "campus" | "class" | "none" {
  if (access.schoolWide) return "all";
  if (hasRole(access, ["vice_principal", "campus_coordinator", "department_head"])) return "campus";
  if (access.classIds.length > 0) return "class";
  return "none";
}

export function canAssignTeachers(access: Access) {
  return hasRole(access, [
    "principal",
    "vice_principal",
    "campus_coordinator",
    "department_head",
    "system_admin",
  ]);
}

export function canAssignTasks(access: Access) {
  return hasRole(access, ["principal", "vice_principal", "department_head", "campus_coordinator"]);
}

export function canApproveTasks(access: Access) {
  return hasRole(access, ["principal", "vice_principal"]);
}

export function canEditStudent(access: Access) {
  return hasRole(access, ["principal", "vice_principal", "homeroom_teacher", "campus_coordinator", "system_admin"]);
}

export function canEditStudentRecord(access: Access, classId: string | null, campusId: string | null) {
  if (!canEditStudent(access)) return false;
  if (access.schoolWide) return true;
  if (hasRole(access, ["vice_principal", "campus_coordinator"]) && campusId) {
    return access.campusIds.includes(campusId);
  }
  if (hasRole(access, ["homeroom_teacher"]) && classId) {
    return access.classIds.includes(classId);
  }
  return false;
}

export function canEditStaff(access: Access, campusId?: string | null) {
  if (hasRole(access, ["principal", "system_admin"])) return true;
  if (hasRole(access, ["vice_principal", "campus_coordinator"])) {
    if (!campusId) return true;
    return access.campusIds.includes(campusId);
  }
  return false;
}

export function assert(condition: boolean, message = "Không có quyền thực hiện thao tác này") {
  if (!condition) {
    const err = new Error(message);
    err.name = "ForbiddenError";
    throw err;
  }
}
