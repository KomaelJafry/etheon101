import { createServiceClient } from './supabase/server'

interface AuditParams {
  adminId: string
  action: string
  targetTable?: string
  targetId?: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
}

export async function logAudit(params: AuditParams) {
  const supabase = await createServiceClient()
  await supabase.from('audit_logs').insert({
    admin_id: params.adminId,
    action: params.action,
    target_table: params.targetTable,
    target_id: params.targetId,
    old_value: params.oldValue,
    new_value: params.newValue,
  })
}
