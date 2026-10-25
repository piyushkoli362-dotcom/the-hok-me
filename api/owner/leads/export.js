// Keep CSV export on an explicit Vercel function route. This avoids relying
// on catch-all routing for a nested path under /api/owner/leads.
module.exports = require('../../../lib/server/owner-api/lead-export');
