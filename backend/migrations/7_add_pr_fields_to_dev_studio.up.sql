ALTER TABLE dev_studio_requests 
ADD COLUMN pr_number BIGINT,
ADD COLUMN pr_url TEXT,
ADD COLUMN branch_name VARCHAR(255);

CREATE INDEX idx_dev_studio_requests_pr_number ON dev_studio_requests(pr_number);
