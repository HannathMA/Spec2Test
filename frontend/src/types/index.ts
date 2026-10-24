export interface Project {
  id: string;
  name: string;
  description?: string;
  target_url: string;
  test_framework: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface AcceptanceCriterion {
  id: string;
  requirement_id: string;
  criterion_id: string;
  criterion_text: string;
  format: string;
  review_status: 'pending' | 'approved' | 'rejected' | string;
  is_approved: boolean;
  version_number: number;
  created_at: string;
}

export interface AnalysisFinding {
  id: string;
  requirement_id: string;
  finding_type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  explanation: string;
  suggested_clarification?: string;
  created_at: string;
}

export interface RequirementVersion {
  id: string;
  requirement_id: string;
  version_number: number;
  title: string;
  original_text: string;
  description?: string;
  priority: string;
  status: string;
  change_summary?: string;
  created_at: string;
}

export interface Requirement {
  id: string;
  project_id: string;
  req_id: string;
  title: string;
  original_text: string;
  description?: string;
  priority: string;
  status: string;
  current_version: number;
  created_at: string;
  updated_at: string;
  acceptance_criteria_count?: number;
  test_cases_count?: number;
  verification_status?: 'Verified' | 'Failed' | 'Unverified';
  acceptance_criteria?: AcceptanceCriterion[];
  findings?: AnalysisFinding[];
  versions?: RequirementVersion[];
}

export interface TestCase {
  id: string;
  project_id: string;
  requirement_id?: string;
  test_id: string;
  title: string;
  description?: string;
  linked_req_id?: string;
  linked_criterion_ids: string[];
  test_type: 'Positive' | 'Negative' | 'Boundary' | 'Edge Case' | 'Performance' | 'Security';
  priority: 'High' | 'Medium' | 'Low';
  preconditions?: string;
  input_data?: Record<string, any>;
  steps?: string[];
  expected_outcome: string;
  execution_method: string;
  generated_code?: string;
  test_module_name?: string;
  test_function_name?: string;
  review_status: 'Draft' | 'Approved' | 'Rejected';
  is_stale: boolean;
  req_version_at_generation: number;
  latest_status: 'Passed' | 'Failed' | 'Unverified' | 'Error';
  created_at: string;
  updated_at: string;
}

export interface EvidenceRecord {
  id: string;
  test_result_id: string;
  evidence_type: string;
  title: string;
  content: string;
  metadata_json: Record<string, any>;
  created_at: string;
}

export interface TestResult {
  id: string;
  run_id: string;
  test_case_id: string;
  test_id: string;
  test_title: string;
  linked_req_id?: string;
  status: 'Passed' | 'Failed' | 'Error' | 'Skipped' | 'Blocked';
  duration_ms: number;
  assertion_message?: string;
  failure_details?: string;
  stack_trace?: string;
  stdout?: string;
  stderr?: string;
  is_stale: boolean;
  created_at: string;
  evidence: EvidenceRecord[];
}

export interface TestRun {
  id: string;
  project_id: string;
  run_number: string;
  status: string;
  environment: string;
  framework: string;
  target_url?: string;
  total_tests: number;
  passed_count: number;
  failed_count: number;
  skipped_count: number;
  error_count: number;
  started_at: string;
  completed_at?: string;
  duration_ms: number;
  raw_stdout?: string;
  raw_stderr?: string;
  exit_code?: number;
  created_at: string;
  results?: TestResult[];
}

export interface TraceabilityLinkedCriterion {
  criterion_id: string;
  criterion_text: string;
  review_status?: string;
  is_approved: boolean;
}

export interface TraceabilityLinkedTest {
  test_id: string;
  title: string;
  test_type: string;
  priority: string;
  latest_status: string;
  is_stale: boolean;
  evidence_url?: string;
  last_run_id?: string;
}

export interface TraceabilityRow {
  requirement_id: string;
  req_id: string;
  title: string;
  priority: string;
  approved_criteria_count: number;
  linked_criteria: TraceabilityLinkedCriterion[];
  linked_test_count: number;
  linked_tests: TraceabilityLinkedTest[];
  latest_execution_state: string;
  verification_state: 'Verified' | 'Failed' | 'Unverified';
  has_missing_coverage: boolean;
  missing_coverage_reason?: string;
  has_stale_tests: boolean;
}

export interface TraceabilityMatrixResponse {
  total_requirements: number;
  verified_count: number;
  failed_count: number;
  unverified_count: number;
  verification_rate: number;
  rows: TraceabilityRow[];
}

export interface AffectedTestSummary {
  test_id: string;
  title: string;
  test_type: string;
  action_required: string;
  current_status: string;
}

export interface ChangeImpactResponse {
  record_id?: string;
  requirement_id: string;
  req_id: string;
  old_version: number;
  new_version: number;
  old_text: string;
  new_text: string;
  diff_summary: string;
  affected_test_cases: AffectedTestSummary[];
  affected_test_cases_count: number;
  new_test_cases_needed: number;
  tests_to_rerun_count: number;
  stale_results_count: number;
  status: string;
  created_at: string;
}

export interface ProjectStats {
  project: Project;
  metrics: {
    total_requirements: number;
    acceptance_criteria: number;
    generated_tests: number;
    passed_tests: number;
    failed_tests: number;
    unverified_tests: number;
    verified_requirements: number;
    failed_requirements: number;
    unverified_requirements: number;
    verification_rate: number;
  };
  recent_activity: {
    id: string;
    event_type: string;
    title: string;
    description: string;
    created_at: string;
  }[];
}

export interface SettingsData {
  project_name: string;
  target_url: string;
  test_framework: string;
  environment: string;
  ai_provider: string;
  ai_api_key?: string;
  ai_model: string;
  ai_configured: boolean;
  execution_timeout_seconds: number;
}
