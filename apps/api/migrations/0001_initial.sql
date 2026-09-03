CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS managed_resources (id TEXT PRIMARY KEY, resource_type TEXT NOT NULL, name TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_managed_resources_type ON managed_resources(resource_type);
CREATE TABLE IF NOT EXISTS operation_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT, success INTEGER NOT NULL, error_message TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at DESC);
CREATE TABLE IF NOT EXISTS file_objects (object_key TEXT PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT, size INTEGER NOT NULL, bucket TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_file_objects_bucket ON file_objects(bucket);
