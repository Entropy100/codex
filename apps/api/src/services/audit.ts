import type { Bindings } from '../types';
export async function audit(env: Bindings, action: string, resourceType: string, resourceId: string | null, success: boolean, errorMessage: string | null = null) {
  await env.DB.prepare('INSERT INTO operation_logs (action, resource_type, resource_id, success, error_message) VALUES (?, ?, ?, ?, ?)').bind(action, resourceType, resourceId, success ? 1 : 0, errorMessage).run();
}
