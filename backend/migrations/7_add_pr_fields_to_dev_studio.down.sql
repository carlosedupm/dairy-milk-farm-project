DROP INDEX IF EXISTS idx_dev_studio_requests_pr_number;
ALTER TABLE dev_studio_requests 
DROP COLUMN IF EXISTS pr_number,
DROP COLUMN IF EXISTS pr_url,
DROP COLUMN IF EXISTS branch_name;
