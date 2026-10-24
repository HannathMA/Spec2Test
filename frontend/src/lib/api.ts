import {
  Project,
  ProjectStats,
  Requirement,
  TestCase,
  TestRun,
  TraceabilityMatrixResponse,
  ChangeImpactResponse,
  SettingsData,
  AcceptanceCriterion
} from '../types';
const RAW_API_URL = import.meta.env.VITE_API_URL 
  ? String(import.meta.env.VITE_API_URL).trim().replace(/\/$/, '') 
  : (import.meta.env.PROD ? 'https://spec2test-backend.onrender.com' : '');
export const API_BASE = RAW_API_URL ? `${RAW_API_URL}/api/v1` : '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const err = await res.json();
        errorDetail = err.detail || err.message || JSON.stringify(err);
      } else {
        const text = await res.text();
        if (text.includes('<!doctype') || text.includes('<html')) {
          errorDetail = 'Backend API is connecting or starting up on Render. Please wait 10-20 seconds and retry.';
        } else if (text.length > 0 && text.length < 200) {
          errorDetail = text;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    return handleResponse<Project[]>(res);
  },

  async createProject(data: { name: string; description?: string; target_url?: string }): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Project>(res);
  },

  async getProjectStats(projectId: string): Promise<ProjectStats> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/stats`);
    return handleResponse<ProjectStats>(res);
  },

  // Requirements
  async getRequirements(projectId: string): Promise<Requirement[]> {
    const res = await fetch(`${API_BASE}/requirements?project_id=${projectId}`);
    return handleResponse<Requirement[]>(res);
  },

  async getRequirement(id: string): Promise<Requirement> {
    const res = await fetch(`${API_BASE}/requirements/${id}`);
    return handleResponse<Requirement>(res);
  },

  async createRequirement(data: { project_id: string; title: string; original_text: string; priority?: string }): Promise<Requirement> {
    const res = await fetch(`${API_BASE}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Requirement>(res);
  },

  async uploadRequirementFile(projectId: string, file: File, title?: string, priority = 'High'): Promise<Requirement> {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('file', file);
    if (title) formData.append('title', title);
    formData.append('priority', priority);

    const res = await fetch(`${API_BASE}/requirements/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<Requirement>(res);
  },

  async analyzeRequirement(requirementId: string): Promise<Requirement> {
    const res = await fetch(`${API_BASE}/requirements/${requirementId}/analyze`, {
      method: 'POST',
    });
    return handleResponse<Requirement>(res);
  },

  async updateCriterion(criterionId: string, data: { criterion_text?: string; is_approved?: boolean; review_status?: string }): Promise<AcceptanceCriterion> {
    const res = await fetch(`${API_BASE}/requirements/criteria/${criterionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<AcceptanceCriterion>(res);
  },

  async regenerateCriterion(criterionId: string): Promise<AcceptanceCriterion> {
    const res = await fetch(`${API_BASE}/requirements/criteria/${criterionId}/regenerate`, {
      method: 'POST',
    });
    return handleResponse<AcceptanceCriterion>(res);
  },

  async createCriterion(requirementId: string, data: { criterion_text: string; criterion_id?: string; review_status?: string; is_approved?: boolean }): Promise<AcceptanceCriterion> {
    const res = await fetch(`${API_BASE}/requirements/${requirementId}/criteria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<AcceptanceCriterion>(res);
  },

  async deleteCriterion(criterionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/requirements/criteria/${criterionId}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to delete criterion: ${res.statusText}`);
    }
  },

  async batchApproveCriteria(requirementId: string, criterionIds: string[], approve = true): Promise<any> {
    const res = await fetch(`${API_BASE}/requirements/${requirementId}/criteria/batch-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ criterion_ids: criterionIds, approve }),
    });
    return handleResponse(res);
  },

  // Test Cases
  async getTestCases(projectId: string, filters?: { requirement_id?: string; test_type?: string; priority?: string; review_status?: string }): Promise<TestCase[]> {
    const params = new URLSearchParams({ project_id: projectId });
    if (filters?.requirement_id) params.append('requirement_id', filters.requirement_id);
    if (filters?.test_type) params.append('test_type', filters.test_type);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.review_status) params.append('review_status', filters.review_status);

    const res = await fetch(`${API_BASE}/test-cases?${params.toString()}`);
    return handleResponse<TestCase[]>(res);
  },

  async generateTestCases(projectId: string, requirementId?: string, overwrite = false): Promise<TestCase[]> {
    const res = await fetch(`${API_BASE}/test-cases/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, requirement_id: requirementId, overwrite_existing: overwrite }),
    });
    return handleResponse<TestCase[]>(res);
  },

  async getTestCase(id: string): Promise<TestCase> {
    const res = await fetch(`${API_BASE}/test-cases/${id}`);
    return handleResponse<TestCase>(res);
  },

  async updateTestCase(id: string, data: Partial<TestCase>): Promise<TestCase> {
    const res = await fetch(`${API_BASE}/test-cases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<TestCase>(res);
  },

  async deleteTestCase(id: string): Promise<void> {
    await fetch(`${API_BASE}/test-cases/${id}`, { method: 'DELETE' });
  },

  // Execution
  async getTestRuns(projectId: string): Promise<TestRun[]> {
    const res = await fetch(`${API_BASE}/execution/runs?project_id=${projectId}`);
    return handleResponse<TestRun[]>(res);
  },

  async getTestRun(id: string): Promise<TestRun> {
    const res = await fetch(`${API_BASE}/execution/runs/${id}`);
    return handleResponse<TestRun>(res);
  },

  async executeTests(data: { project_id: string; test_case_ids?: string[]; environment?: string; rerun_failed_only?: boolean }): Promise<TestRun> {
    const res = await fetch(`${API_BASE}/execution/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<TestRun>(res);
  },

  // Traceability
  async getTraceabilityMatrix(projectId: string): Promise<TraceabilityMatrixResponse> {
    const res = await fetch(`${API_BASE}/traceability/matrix?project_id=${projectId}`);
    return handleResponse<TraceabilityMatrixResponse>(res);
  },

  // Change Impact
  async analyzeChangeImpact(data: { requirement_id: string; new_text: string }): Promise<ChangeImpactResponse> {
    const res = await fetch(`${API_BASE}/change-impact/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ChangeImpactResponse>(res);
  },

  async approveChangeImpact(data: { impact_record_id?: string; requirement_id: string; new_text: string; auto_regenerate_tests?: boolean }): Promise<ChangeImpactResponse> {
    const res = await fetch(`${API_BASE}/change-impact/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<ChangeImpactResponse>(res);
  },

  async getChangeImpactRecords(projectId: string): Promise<ChangeImpactResponse[]> {
    const res = await fetch(`${API_BASE}/change-impact/records?project_id=${projectId}`);
    return handleResponse<ChangeImpactResponse[]>(res);
  },

  // Settings
  async getSettings(): Promise<SettingsData> {
    const res = await fetch(`${API_BASE}/settings`);
    return handleResponse<SettingsData>(res);
  },

  async updateSettings(data: Partial<SettingsData>): Promise<SettingsData> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<SettingsData>(res);
  },

  async testConnection(targetUrl: string): Promise<{ success: boolean; status_code?: number; response_time_ms?: number; message: string }> {
    const res = await fetch(`${API_BASE}/settings/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_url: targetUrl }),
    });
    return handleResponse(res);
  },

  // Demo Project Reset
  async resetDemoProject(): Promise<{ status: string; message: string; project_id: string }> {
    const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
    return handleResponse(res);
  }
};
