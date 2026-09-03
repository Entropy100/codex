export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: { code: string; message: string } };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export type AuditLog = { id: number; action: string; resourceType: string; resourceId: string | null; success: boolean; errorMessage: string | null; createdAt: string };
export type Overview = { services: Record<string, boolean>; counts: Record<string, number>; logs: AuditLog[] };
