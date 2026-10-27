const { execute, queryAll } = require('../db');

function logAudit({ userId = null, action, entityType, entityId = null, details = null, ipAddress = null }) {
  try {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || '');
    execute(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId ? String(entityId) : null, detailsStr, ipAddress]
    );
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}

function getRecentAuditLogs(limit = 100) {
  return queryAll(
    `SELECT a.*, u.username, u.full_name 
     FROM audit_logs a 
     LEFT JOIN users u ON a.user_id = u.id 
     ORDER BY a.created_at DESC LIMIT ?`,
    [limit]
  );
}

module.exports = {
  logAudit,
  getRecentAuditLogs
};
