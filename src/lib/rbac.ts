export type AppRole = "director" | "physio" | "patient";

export type PhysioScope = "all" | "own";

export type AdminMenuKey =
  | "overview"
  | "users"
  | "patients"
  | "physios"
  | "exercises"
  | "schedule"
  | "symptoms"
  | "audit"
  | "settings";

export interface RbacContext {
  actorId: string;
  actorRole: AppRole;
  physioScope?: PhysioScope | undefined;
  targetPatientId?: string | undefined;
  responsiblePhysioId?: string | undefined;
  creatorId?: string | undefined;
  targetUserId?: string | undefined;
  totalDirectorCount?: number | undefined;
  currentKioskOrDeviceId?: string | undefined;
  currentIp?: string | undefined;
}

/**
 * Checks if a role can access the admin dashboard (/admin)
 */
export function canAccessAdmin(role: AppRole): boolean {
  return role === "director" || role === "physio";
}

/**
 * Returns accessible admin menus for a given role
 */
export function getAccessibleAdminMenus(role: AppRole): AdminMenuKey[] {
  if (role === "director") {
    return [
      "overview",
      "users",
      "patients",
      "physios",
      "exercises",
      "schedule",
      "symptoms",
      "audit",
      "settings",
    ];
  }
  if (role === "physio") {
    // Spec: Physio sees 6 main menus + symptoms, NEVER sees audit and settings
    return [
      "overview",
      "users",
      "patients",
      "physios",
      "exercises",
      "schedule",
      "symptoms",
    ];
  }
  return [];
}

/**
 * Checks if a physio has access to a specific patient based on scope
 */
export function canPhysioAccessPatient(
  physioId: string,
  scope: PhysioScope,
  responsiblePhysioId?: string
): boolean {
  if (scope === "all") {
    return true;
  }
  return responsiblePhysioId !== undefined && responsiblePhysioId === physioId;
}

/**
 * Checks if the actor can view patient details
 */
export function canViewPatient(ctx: RbacContext): boolean {
  if (ctx.actorRole === "director") return true;
  if (ctx.actorRole === "physio") {
    const scope = ctx.physioScope ?? "all";
    return canPhysioAccessPatient(ctx.actorId, scope, ctx.responsiblePhysioId);
  }
  if (ctx.actorRole === "patient") {
    return ctx.targetPatientId === ctx.actorId;
  }
  return false;
}

/**
 * Checks if the actor can edit patient details
 */
export function canEditPatient(ctx: RbacContext): boolean {
  if (ctx.actorRole === "director") return true;
  if (ctx.actorRole === "physio") {
    const scope = ctx.physioScope ?? "all";
    return canPhysioAccessPatient(ctx.actorId, scope, ctx.responsiblePhysioId);
  }
  return false;
}

/**
 * Checks if the actor can create an account of a given target role
 */
export function canCreateAccount(actorRole: AppRole, targetRole: AppRole): boolean {
  if (actorRole === "director") return true;
  if (actorRole === "physio") {
    // Physio can ONLY create patient accounts
    return targetRole === "patient";
  }
  return false;
}

/**
 * Checks if the actor can edit a user's details or reset password
 */
export function canEditUser(ctx: RbacContext, targetUserRole: AppRole): boolean {
  if (ctx.actorRole === "director") return true;
  if (ctx.actorRole === "physio") {
    if (ctx.targetUserId === ctx.actorId) return true;
    if (targetRoleIsPatient(targetUserRole)) {
      const scope = ctx.physioScope ?? "all";
      return canPhysioAccessPatient(ctx.actorId, scope, ctx.responsiblePhysioId);
    }
  }
  return false;
}

/**
 * Checks if the actor can delete an account, enforcing safeguard rules
 */
export function canDeleteAccount(
  ctx: RbacContext,
  targetUserRole: AppRole
): { allowed: boolean; reason?: string } {
  // Safeguard: Cannot delete self
  if (ctx.targetUserId === ctx.actorId) {
    return { allowed: false, reason: "ห้ามลบบัญชีของตนเอง" };
  }

  // Safeguard: Cannot delete the last director
  if (targetUserRole === "director") {
    const totalDirectors = ctx.totalDirectorCount ?? 1;
    if (totalDirectors <= 1) {
      return { allowed: false, reason: "ห้ามลบผู้อำนวยการคนสุดท้ายของระบบ" };
    }
  }

  if (ctx.actorRole === "director") {
    return { allowed: true };
  }

  if (ctx.actorRole === "physio") {
    if (targetRoleIsPatient(targetUserRole)) {
      const scope = ctx.physioScope ?? "all";
      const hasAccess = canPhysioAccessPatient(ctx.actorId, scope, ctx.responsiblePhysioId);
      if (hasAccess) return { allowed: true };
      return { allowed: false, reason: "ไม่มีสิทธิ์จัดการคนไข้นอกความดูแล" };
    }
    return { allowed: false, reason: "นักกายภาพสามารถลบได้เฉพาะบัญชีคนไข้เท่านั้น" };
  }

  return { allowed: false, reason: "ไม่มีสิทธิ์ดำเนินการ" };
}

/**
 * Checks if the actor can edit or delete an exercise or quiz item
 */
export function canManageContentItem(
  actorRole: AppRole,
  actorId: string,
  creatorId?: string
): boolean {
  if (actorRole === "director") return true;
  if (actorRole === "physio") {
    // Physio can ONLY edit/delete items they created themselves
    return creatorId !== undefined && creatorId === actorId;
  }
  return false;
}

/**
 * Checks if the actor can ban a device or IP, enforcing safeguard rules
 */
export function canBanTarget(
  ctx: RbacContext,
  targetValue: string,
  kind: "device" | "ip"
): { allowed: boolean; reason?: string } {
  if (ctx.actorRole !== "director") {
    return { allowed: false, reason: "เฉพาะผู้อำนวยการเท่านั้นที่สามารถจัดการการแบนได้" };
  }

  // Safeguard: Director cannot ban their own active device or IP
  if (kind === "device" && ctx.currentKioskOrDeviceId === targetValue) {
    return { allowed: false, reason: "ห้ามแบนเครื่องที่ตนเองกำลังใช้งานอยู่" };
  }
  if (kind === "ip" && ctx.currentIp === targetValue) {
    return { allowed: false, reason: "ห้ามแบน IP ที่ตนเองกำลังใช้งานอยู่" };
  }

  return { allowed: true };
}

/**
 * Checks if the actor can read/write system settings
 */
export function canManageSystemSettings(role: AppRole): boolean {
  return role === "director";
}

/**
 * Checks if the actor can access audit logs, kick sessions, and manage bans
 */
export function canManageAuditAndBans(role: AppRole): boolean {
  return role === "director";
}

function targetRoleIsPatient(role: AppRole): boolean {
  return role === "patient";
}
