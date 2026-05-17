ALTER TABLE personas DROP CONSTRAINT IF EXISTS personas_scope_check;
ALTER TABLE personas ADD CONSTRAINT personas_scope_check CHECK (scope IN ('global', 'scoped', 'excluded'));
