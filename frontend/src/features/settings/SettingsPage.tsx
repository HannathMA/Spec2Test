import React, { useState, useEffect } from 'react';
import {
  Settings,
  Server,
  Layers,
  Cpu,
  GitBranch,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Save,
  X
} from 'lucide-react';
import { SettingsData } from '../../types';
import { api } from '../../lib/api';

interface SettingsPageProps {
  onRefresh: () => void;
  onResetDemo: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefresh, onResetDemo }) => {
  const [activeTab, setActiveTab] = useState<'environment' | 'framework' | 'model' | 'integrations'>('environment');

  const [settings, setSettings] = useState<SettingsData>({
    project_name: 'Spec2Test AI',
    target_url: 'http://127.0.0.1:8000/demo-target',
    test_framework: 'pytest 8.3.2',
    environment: 'Local',
    ai_provider: 'local',
    ai_model: 'gpt-4o-mini',
    ai_configured: false,
    execution_timeout_seconds: 45
  });

  const [targetUrl, setTargetUrl] = useState('http://127.0.0.1:8000/demo-target');
  const [environment, setEnvironment] = useState('Local');
  const [aiProvider, setAiProvider] = useState('local');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string; ms?: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setTargetUrl(data.target_url);
      setEnvironment(data.environment);
      setAiProvider(data.ai_provider);
      setAiModel(data.ai_model);
    } catch {
      // fallback
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await api.testConnection(targetUrl);
      setConnectionResult({
        success: res.success,
        message: res.message,
        ms: res.response_time_ms
      });
    } catch (err: any) {
      setConnectionResult({
        success: false,
        message: err.message || 'Connection test failed'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedbackMsg(null);
    try {
      const updated = await api.updateSettings({
        target_url: targetUrl,
        environment: environment,
        ai_provider: aiProvider,
        ai_api_key: aiKey || undefined,
        ai_model: aiModel
      });
      setSettings(updated);
      setFeedbackMsg({ type: 'success', text: 'Settings updated successfully.' });
      onRefresh();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D7D6D0] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171717] tracking-tight font-sans">
            Project Settings
          </h1>
          <p className="text-sm text-[#555555] mt-1 font-sans">
            Configure your test environment and integrations.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 border text-xs flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-[#EBF7EE] border-[#C2E7CB] text-[#16845B]'
              : 'bg-[#FDEDED] border-[#F8C8C8] text-[#D93D3D]'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold ml-4">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs Row (Matching Screenshot: Environment, Framework, Model, Integrations) */}
      <div className="flex items-center gap-1 border-b border-[#D7D6D0]">
        <button
          onClick={() => setActiveTab('environment')}
          className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'environment'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#777777] hover:text-[#171717]'
          }`}
        >
          <Server size={14} /> Environment
        </button>
        <button
          onClick={() => setActiveTab('framework')}
          className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'framework'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#777777] hover:text-[#171717]'
          }`}
        >
          <Layers size={14} /> Framework
        </button>
        <button
          onClick={() => setActiveTab('model')}
          className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'model'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#777777] hover:text-[#171717]'
          }`}
        >
          <Cpu size={14} /> AI Model
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'integrations'
              ? 'border-[#171717] text-[#171717]'
              : 'border-transparent text-[#777777] hover:text-[#171717]'
          }`}
        >
          <GitBranch size={14} /> Integrations
        </button>
      </div>

      {/* Main Settings Split: Left Form (2 Cols), Right Quick Links (1 Col) matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-[#D7D6D0] p-6">
          {activeTab === 'environment' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#171717] uppercase tracking-wide mb-1">
                  Test Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full bg-[#F5F4EF] border border-[#D7D6D0] px-3 py-2 text-xs font-mono outline-none focus:border-[#365CFF]"
                >
                  <option value="Local">Local (Development Sandbox)</option>
                  <option value="Staging">Staging (Pre-production Target)</option>
                  <option value="Production">Production (Read-Only Verification)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#171717] uppercase tracking-wide mb-1">
                  Base Target URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8000/demo-target"
                    className="flex-1 bg-[#F5F4EF] border border-[#D7D6D0] px-3 py-2 text-xs font-mono outline-none focus:border-[#365CFF]"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="bg-[#171717] hover:bg-[#262626] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={testingConnection ? 'animate-spin' : ''} />
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <p className="text-[11px] text-[#777777] mt-1 font-mono">
                  Default: <code>http://127.0.0.1:8000/demo-target</code> (Embedded Commerce API)
                </p>
              </div>

              {connectionResult && (
                <div
                  className={`p-3 border text-xs font-mono flex items-center gap-2 ${
                    connectionResult.success
                      ? 'bg-[#EBF7EE] border-[#C2E7CB] text-[#16845B]'
                      : 'bg-[#FDEDED] border-[#F8C8C8] text-[#D93D3D]'
                  }`}
                >
                  {connectionResult.success ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <span>{connectionResult.message}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#171717] uppercase tracking-wide mb-1">
                  Test Framework
                </label>
                <input
                  type="text"
                  disabled
                  value="pytest (Isolated Subprocess Execution Engine)"
                  className="w-full bg-[#F5F4EF] border border-[#D7D6D0] px-3 py-2 text-xs font-mono text-[#555555]"
                />
              </div>

              <div className="pt-3 border-t border-[#F0F0EE] flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#365CFF] hover:bg-[#2A4BD6] text-white px-5 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Save size={13} /> {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'framework' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-[#171717]">Subprocess Runner & Isolation Specification</h3>
              <p className="text-[#555555] leading-relaxed">
                Spec2Test executes generated pytest tests inside dedicated temporary workspaces with stripped environment variables and resource timeouts.
              </p>
              <div className="p-3 bg-[#FAF9F5] border border-[#E5E4DE] font-mono space-y-1">
                <div>Framework: pytest 8.3.2</div>
                <div>Execution Timeout: 45s</div>
                <div>Isolation Mode: Subprocess Directory Sandbox</div>
                <div>Sanitization: Environment variable cleansing (API keys stripped)</div>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#171717] uppercase tracking-wide mb-1">
                  AI Provider
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full bg-[#F5F4EF] border border-[#D7D6D0] p-2 font-mono"
                >
                  <option value="local">Local Deterministic Engine (No API Key Required)</option>
                  <option value="openai">OpenAI / Compatible Provider</option>
                  <option value="groq">Groq High-Speed Inference</option>
                </select>
                <p className="text-[11px] text-[#777777] mt-1 font-mono">
                  Current mode: {aiProvider === 'local' ? 'Local Deterministic Rules & Heuristics' : 'External LLM'}
                </p>
              </div>

              {aiProvider !== 'local' && (
                <>
                  <div>
                    <label className="block font-semibold text-[#171717] uppercase tracking-wide mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={aiKey}
                      onChange={(e) => setAiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[#F5F4EF] border border-[#D7D6D0] p-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171717] uppercase tracking-wide mb-1">
                      Model Identifier
                    </label>
                    <input
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="gpt-4o-mini"
                      className="w-full bg-[#F5F4EF] border border-[#D7D6D0] p-2 font-mono"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-[#F0F0EE] flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#365CFF] hover:bg-[#2A4BD6] text-white px-5 py-2 text-xs font-semibold uppercase tracking-wider"
                >
                  Save Model Settings
                </button>
              </div>
            </form>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-[#171717]">CI/CD & Source Control</h3>
              <p className="text-[#555555]">
                Spec2Test is designed to plug directly into GitHub Actions and GitLab pipelines via CLI commands.
              </p>
              <div className="p-4 border border-[#D7D6D0] bg-[#FAF9F5]">
                <div className="font-mono text-xs font-bold text-[#171717] mb-1">
                  GitHub Action Workflow Example:
                </div>
                <pre className="p-3 bg-[#171717] text-[#C8F169] font-mono text-[11px] overflow-x-auto">
                  <code>
{`name: Spec2Test Verification
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Spec2Test Verification
        run: pytest tests/`}
                  </code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Links matching screenshot (1 Col) */}
        <div className="bg-white border border-[#D7D6D0] p-6 space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#777777]">
            Quick Links
          </h2>

          <div className="space-y-2 text-xs">
            <div className="p-3 border border-[#E5E4DE] bg-[#FAF9F5] flex items-center justify-between">
              <span className="font-semibold text-[#171717]">GitHub Integration</span>
              <span className="font-mono text-[10px] text-[#777777] bg-[#E5E4DE] px-1.5 py-0.5">
                Ready
              </span>
            </div>

            <div className="p-3 border border-[#E5E4DE] bg-[#FAF9F5] flex items-center justify-between">
              <span className="font-semibold text-[#171717]">CI/CD Pipeline</span>
              <span className="font-mono text-[10px] text-[#777777] bg-[#E5E4DE] px-1.5 py-0.5">
                Coming Soon
              </span>
            </div>

            <div className="p-3 border border-[#E5E4DE] bg-[#FAF9F5] flex items-center justify-between">
              <span className="font-semibold text-[#171717]">Environment Variables</span>
              <span className="font-mono text-[10px] text-[#16845B] bg-[#EBF7EE] px-1.5 py-0.5">
                Configured
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F0F0EE]">
            <button
              onClick={onResetDemo}
              className="w-full bg-[#171717] hover:bg-[#262626] text-white py-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} className="text-[#C8F169]" /> Reset Demo Project
            </button>
            <p className="text-[10px] text-[#777777] text-center mt-1.5 font-mono">
              Re-seeds sample Commerce API verification suite
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
