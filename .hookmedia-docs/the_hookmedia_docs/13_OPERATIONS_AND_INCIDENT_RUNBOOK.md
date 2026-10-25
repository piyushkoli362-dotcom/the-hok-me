# Operations and Incident Runbook

## 1. Routine operational checks
Daily/weekly (cadence should be assigned):
- Review server errors and inquiry submission failures.
- Review oldest pending integration outbox item and permanent sync failures.
- Review failed sign-in/role-change anomalies and audit alerts.
- Review backup status and storage/database usage.
- Review overdue tasks and due follow-ups as part of business operations.
- Rotate access when a team member leaves or a credential is suspected compromised.

## 2. Incident severity
- **SEV-1:** confirmed unauthorised access, secret exposure, major data loss or complete production outage.
- **SEV-2:** material feature failure (inquiries not saving, auth broken, broad integration failure) with workaround limited.
- **SEV-3:** limited feature issue with workaround, visual bug or isolated non-critical sync failure.

Assign an incident lead, record timestamps, scope, actions and decisions.

## 3. Inquiry submissions failing
1. Check monitoring for route error rate and request IDs.
2. Verify database availability, migration state and connection configuration.
3. Check rate limiting/spam provider for false positives.
4. Verify schema constraints and recent deploy changes.
5. Restore the previous application version or forward-fix if appropriate.
6. Test with a synthetic inquiry and verify it exists in PostgreSQL.
7. Reconcile missed submissions only from legitimate retained source data; do not invent records.

## 4. Google Sheets sync failure
1. Confirm leads are still present in PostgreSQL.
2. Check outbox age/status and last provider error code.
3. Verify spreadsheet ID, sharing permissions, API enablement and quota.
4. Rotate credentials if exposure is suspected.
5. Fix the cause and retry one test record using idempotent sync.
6. Retry queued records in a controlled way and watch for duplicates.
7. Record the incident and notify business users that the spreadsheet may be stale.

## 5. Suspected account compromise
1. Disable/revoke the affected account/session using the identity provider's supported controls.
2. Remove suspicious role grants and preserve safe audit evidence.
3. Rotate affected secrets if the account could access them.
4. Inspect audit/security logs for affected records and time window.
5. Review whether client/lead data was accessed or exported.
6. Restore least privilege, enforce MFA/recovery changes and verify access tests.
7. Determine whether legal/customer/regulatory notifications are required with qualified support.

## 6. Secret exposure
1. Revoke the exposed credential immediately; do not merely delete it from the latest commit.
2. Issue a new credential with minimum necessary scope.
3. Remove secret from repository history where necessary, while understanding clones/caches may persist.
4. Check logs and provider activity for misuse.
5. Update hosting secret store, redeploy and test.
6. Document affected systems and follow-up controls.

## 7. Database data loss/corruption
1. Stop destructive jobs/mutations if safe to do so.
2. Preserve logs and incident timeline.
3. Assess provider backup/PITR availability and chosen plan capabilities.
4. Restore into a separate recovery target where possible before promoting it.
5. Validate row counts, relationships, RLS, migrations and inquiry workflow.
6. Coordinate controlled cutover and communicate impact.
7. Post-incident, verify restore instructions and backup cadence.

## 8. Recovery objectives
Set explicit Recovery Point Objective (RPO) and Recovery Time Objective (RTO) after selecting a database plan and understanding business impact. Do not promise a backup frequency or point-in-time recovery feature until the selected plan has been verified.

## 9. Post-incident review
Capture: what happened, customer/business impact, detection time, root cause, contributing factors, response timeline, recovery evidence, controls that failed, corrective actions with owners/dates and tests to prevent recurrence. Keep the review blameless and factual.
