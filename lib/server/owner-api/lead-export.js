const { createRequestClient, isSupabaseConfigured, requireLeadManager, reply } = require('../supabase');

function csvCell(value) {
  let text = value == null ? '' : String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ');
  if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

module.exports = async function ownerLeadExport(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Owner workspace storage is not configured.' } });
  let session;
  try {
    session = createRequestClient(req, res);
    const access = await requireLeadManager(session.client);
    if (access.error) return reply(res, access.error.status, { error: access.error }, session);
    const columns = 'id,public_reference,full_name,email_normalized,phone,company_name,website_url,service_areas,project_description,budget_band,preferred_contact_method,status,follow_up_at,created_at';
    const rows = [];
    for (let from = 0; from < 5000; from += 1000) {
      const { data, error, count } = await session.client.from('leads').select(columns, { count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, Math.min(from + 999, 4999));
      if (error) return reply(res, 503, { error: { code: 'EXPORT_UNAVAILABLE', message: 'Lead export could not be prepared.' } }, session);
      if ((count || 0) > 5000) return reply(res, 413, { error: { code: 'EXPORT_TOO_LARGE', message: 'Export is limited to 5,000 records at a time.' } }, session);
      rows.push(...(data || []));
      if (!data?.length || data.length < 1000) break;
    }
    const { error: auditError } = await session.client.rpc('log_owner_lead_export', { p_row_count: rows.length });
    if (auditError) return reply(res, 503, { error: { code: 'EXPORT_AUDIT_UNAVAILABLE', message: 'Export could not be audited, so no file was prepared.' } }, session);
    const headers = ['Reference','Received (UTC)','Name','Email','Phone','Company','Website','Services','Project summary','Budget','Preferred contact','Status','Follow-up (UTC)'];
    const fields = ['public_reference','created_at','full_name','email_normalized','phone','company_name','website_url','service_areas','project_description','budget_band','preferred_contact_method','status','follow_up_at'];
    const csv = [headers, ...rows.map(row => fields.map(field => row[field] || ''))].map(row => row.map(csvCell).join(',')).join('\r\n');
    session.commit();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="the-hookmedia-leads-${new Date().toISOString().slice(0,10)}.csv"`);
    return res.status(200).send(`\uFEFF${csv}`);
  } catch {
    return reply(res, 503, { error: { code: 'EXPORT_UNAVAILABLE', message: 'Lead export could not be prepared.' } }, session);
  }
};
