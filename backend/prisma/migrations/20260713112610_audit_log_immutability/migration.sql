-- Revoke standard DML modifications
REVOKE UPDATE, DELETE ON "AuditLog" FROM PUBLIC;

-- Create function to throw exception on modification
CREATE OR REPLACE FUNCTION prevent_audit_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

-- Create trigger on AuditLog
CREATE TRIGGER trg_prevent_audit_update
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_modifications();
