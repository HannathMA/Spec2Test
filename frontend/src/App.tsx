import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { OverviewPage } from './features/overview/OverviewPage';
import { RequirementsPage } from './features/requirements/RequirementsPage';
import { TestLabPage } from './features/test-lab/TestLabPage';
import { ExecutionPage } from './features/execution/ExecutionPage';
import { TraceabilityPage } from './features/traceability/TraceabilityPage';
import { ChangeImpactPage } from './features/change-impact/ChangeImpactPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { api } from './lib/api';
import { Project, ProjectStats, Requirement, TestCase, TestRun } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export function AppContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);

  // Load projects initially with retry on cold start
  const loadProjects = async (retries = 4) => {
    try {
      const list = await api.getProjects();
      setProjects(list);
      if (list.length > 0) {
        setActiveProject((current) => {
          if (current) return current;
          return list.find((p) => p.name === 'Commerce API Verification') || list[0];
        });
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      if (retries > 0) {
        setTimeout(() => loadProjects(retries - 1), 3000);
      }
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Load project-specific data
  const loadProjectData = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const [statsData, reqsData, testsData, runsData] = await Promise.all([
        api.getProjectStats(activeProject.id).catch(() => null),
        api.getRequirements(activeProject.id).catch(() => []),
        api.getTestCases(activeProject.id).catch(() => []),
        api.getTestRuns(activeProject.id).catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setRequirements(reqsData);
      setTestCases(testsData);
      setTestRuns(runsData);
    } catch (err) {
      console.error('Error loading project data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeProject) {
      loadProjectData();
    }
  }, [activeProject?.id]);

  const handleResetDemo = async () => {
    try {
      const res = await api.resetDemoProject();
      await loadProjects();
      const updatedList = await api.getProjects();
      const demo = updatedList.find((p) => p.id === res.project_id) || updatedList[0];
      setActiveProject(demo);
      await loadProjectData();
    } catch (err) {
      console.error('Failed to reset demo project:', err);
    }
  };

  return (
    <AppShell
      projects={projects}
      activeProject={activeProject}
      onSelectProject={(p) => setActiveProject(p)}
      onRefreshData={loadProjectData}
      onResetDemo={handleResetDemo}
    >
      <Routes>
        <Route
          path="/"
          element={
            <OverviewPage
              stats={stats}
              activeProject={activeProject}
              loading={loading}
              onRefresh={loadProjectData}
            />
          }
        />
        <Route
          path="/requirements"
          element={
            <RequirementsPage
              projectId={activeProject?.id || ''}
              requirements={requirements}
              loading={loading}
              onRefresh={loadProjectData}
            />
          }
        />
        <Route
          path="/test-lab"
          element={
            <TestLabPage
              projectId={activeProject?.id || ''}
              testCases={testCases}
              loading={loading}
              onRefresh={loadProjectData}
            />
          }
        />
        <Route
          path="/execution"
          element={
            <ExecutionPage
              projectId={activeProject?.id || ''}
              runs={testRuns}
              loading={loading}
              onRefresh={loadProjectData}
            />
          }
        />
        <Route
          path="/traceability"
          element={
            <TraceabilityPage
              projectId={activeProject?.id || ''}
              loading={loading}
              onRefresh={loadProjectData}
            />
          }
        />
        <Route
          path="/change-impact"
          element={
            <ChangeImpactPage
              projectId={activeProject?.id || ''}
              requirements={requirements}
              loading={loading}
              onRefresh={loadProjectData}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <SettingsPage
              onRefresh={loadProjectData}
              onResetDemo={handleResetDemo}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
