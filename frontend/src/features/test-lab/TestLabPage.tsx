import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  Play,
  Code,
  Sliders,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Trash2,
  X,
  Copy,
  Check
} from 'lucide-react';
import { TestCase } from '../../types';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';

interface TestLabPageProps {
  projectId: string;
  testCases: TestCase[];
  loading: boolean;
  onRefresh: () => void;
}

export const TestLabPage: React.FC<TestLabPageProps> = ({
  projectId,
  testCases,
  loading,
  onRefresh
}) => {
  const navigate = useNavigate();

  // Active view tab: 'cases' | 'code' | 'settings'
  const [activeTab, setActiveTab] = useState<'cases' | 'code' | 'settings'>('cases');

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected test case for Code inspection drawer
  const [inspectedTest, setInspectedTest] = useState<TestCase | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const filteredTests = testCases.filter((tc) => {
    if (typeFilter !== 'all' && tc.test_type !== typeFilter) return false;
    if (statusFilter !== 'all' && tc.latest_status !== statusFilter) return false;
    if (priorityFilter !== 'all' && tc.priority !== priorityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tc.test_id.toLowerCase().includes(q) ||
        tc.title.toLowerCase().includes(q) ||
        (tc.linked_req_id && tc.linked_req_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleGenerateTests = async () => {
    setGenerating(true);
    setFeedbackMsg(null);
    try {
      const generated = await api.generateTestCases(projectId, undefined, false);
      if (generated.length === 0) {
        setFeedbackMsg({
          type: 'info',
          text: 'No test cases generated. Tests are only synthesized from "Approved" acceptance criteria. Please review and approve criteria in the Requirements tab.'
        });
      } else {
        setFeedbackMsg({ type: 'success', text: `Generated ${generated.length} executable test cases from approved criteria!` });
      }
      onRefresh();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Test generation failed' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D7D6D0] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171717] tracking-tight font-sans">
            Test Lab
          </h1>
          <p className="text-sm text-[#555555] mt-1 font-sans">
            Generate, review and run executable tests.
          </p>
        </div>

        {/* Primary actions matching screenshot */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateTests}
            disabled={generating}
            className="bg-[#171717] hover:bg-[#262626] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <FlaskConical size={14} className={`text-[#C8F169] ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating...' : 'Generate Tests'}
          </button>
          <button
            onClick={() => navigate('/execution')}
            className="bg-[#365CFF] hover:bg-[#2A4BD6] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Play size={13} /> Run Tests
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 border text-xs flex items-center justify-between ${
            feedbackMsg.type === 'success'
              ? 'bg-[#EBF7EE] border-[#C2E7CB] text-[#16845B]'
              : feedbackMsg.type === 'info'
              ? 'bg-[#F0F4FF] border-[#D0DDFF] text-[#365CFF]'
              : 'bg-[#FDEDED] border-[#F8C8C8] text-[#D93D3D]'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold ml-4">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Developer Review Gate Note */}
      <div className="bg-[#FAF9F5] border border-[#E5E4DE] px-4 py-2.5 text-xs font-mono text-[#555555] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#16845B] flex-shrink-0"></span>
          <span>
            <strong>Developer Review Gate:</strong> Test generation strictly synthesizes test cases from <em>Approved</em> criteria. Criteria marked as &ldquo;Pending&rdquo; or &ldquo;Rejected&rdquo; are omitted.
          </span>
        </span>
        <button
          onClick={() => navigate('/requirements')}
          className="text-[#365CFF] hover:underline flex items-center gap-1 font-bold flex-shrink-0"
        >
          Review Criteria &rarr;
        </button>
      </div>

      {/* Tabs Row (Matching Screenshot: Test Cases (64), Generated Code, Test Settings) */}
      <div className="flex items-center justify-between border-b border-[#D7D6D0]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'cases'
                ? 'border-[#171717] text-[#171717]'
                : 'border-transparent text-[#777777] hover:text-[#171717]'
            }`}
          >
            Test Cases ({testCases.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('code');
              if (!inspectedTest && testCases.length > 0) setInspectedTest(testCases[0]);
            }}
            className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'code'
                ? 'border-[#171717] text-[#171717]'
                : 'border-transparent text-[#777777] hover:text-[#171717]'
            }`}
          >
            Generated Code
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'settings'
                ? 'border-[#171717] text-[#171717]'
                : 'border-transparent text-[#777777] hover:text-[#171717]'
            }`}
          >
            Test Settings
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 pb-1">
          <input
            type="text"
            placeholder="Filter test cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border border-[#D7D6D0] px-2.5 py-1 text-xs outline-none focus:border-[#365CFF] w-40"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-[#D7D6D0] px-2 py-1 text-xs font-mono"
          >
            <option value="all">All Types</option>
            <option value="Positive">Positive</option>
            <option value="Negative">Negative</option>
            <option value="Boundary">Boundary</option>
            <option value="Edge Case">Edge Case</option>
            <option value="Performance">Performance</option>
            <option value="Security">Security</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#D7D6D0] px-2 py-1 text-xs font-mono"
          >
            <option value="all">All Status</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
            <option value="Unverified">Unverified</option>
          </select>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'cases' && (
        <div className="bg-white border border-[#D7D6D0]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D7D6D0] bg-[#FAF9F5] text-[#777777] font-mono uppercase text-[11px]">
                  <th className="py-3 px-4 font-semibold">ID</th>
                  <th className="py-3 px-4 font-semibold">Requirement</th>
                  <th className="py-3 px-4 font-semibold">Test Case</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EE]">
                {filteredTests.map((tc) => (
                  <tr
                    key={tc.id}
                    className="hover:bg-[#FBFBFA] transition-colors cursor-pointer"
                    onClick={() => setInspectedTest(tc)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#171717]">
                      {tc.test_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#365CFF]">
                      {tc.linked_req_id || '—'}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#171717]">
                      {tc.title}
                      {tc.is_stale && (
                        <span className="ml-2 text-[10px] font-mono text-[#E65100] bg-[#FFF8E1] px-1 py-0.5 border border-[#FFE082]">
                          STALE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-1.5 py-0.5 bg-[#F5F4EF] border border-[#E5E4DE] text-[11px] text-[#555555]">
                        {tc.test_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#555555]">
                      {tc.priority}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={tc.latest_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setInspectedTest(tc)}
                        className="px-2 py-1 text-xs font-mono text-[#365CFF] hover:bg-[#EEF2FF] border border-transparent hover:border-[#D0DDFF] transition-colors mr-1"
                        title="View Pytest Code"
                      >
                        Code
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#777777]">
                      No test cases match filter. Click &ldquo;Generate Tests&rdquo; to create test cases from requirements.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generated Code Tab */}
      {activeTab === 'code' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Case Selector list */}
          <div className="bg-white border border-[#D7D6D0] p-4 max-h-[600px] overflow-y-auto space-y-1">
            <div className="text-[11px] font-mono text-[#777777] uppercase tracking-wider mb-2">
              Select Test Case Module:
            </div>
            {testCases.map((tc) => (
              <button
                key={tc.id}
                onClick={() => setInspectedTest(tc)}
                className={`w-full text-left p-2.5 text-xs transition-colors border ${
                  inspectedTest?.id === tc.id
                    ? 'border-[#171717] bg-[#F5F4EF] font-bold'
                    : 'border-transparent hover:bg-[#FAF9F5]'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span>{tc.test_id}</span>
                  <span className="text-[#777777]">{tc.test_type}</span>
                </div>
                <div className="truncate text-xs font-medium text-[#171717] mt-0.5">
                  {tc.title}
                </div>
              </button>
            ))}
          </div>

          {/* Code Viewer Panel (2 Cols) */}
          <div className="lg:col-span-2 bg-[#171717] text-white border border-[#262626] p-6 flex flex-col justify-between">
            {inspectedTest ? (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#333333] mb-4">
                  <div>
                    <div className="font-mono text-xs text-[#C8F169]">
                      {inspectedTest.test_module_name || `test_${inspectedTest.test_id.toLowerCase()}.py`}
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {inspectedTest.title}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyCode(inspectedTest.generated_code || '')}
                    className="px-2.5 py-1 text-xs font-mono bg-[#262626] hover:bg-[#333333] text-neutral-200 flex items-center gap-1 border border-[#444444] transition-colors"
                  >
                    {copied ? <Check size={12} className="text-[#C8F169]" /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <pre className="font-mono text-xs text-[#E5E5E5] bg-[#121212] p-4 border border-[#262626] overflow-x-auto max-h-[440px] leading-relaxed">
                  <code>{inspectedTest.generated_code || '# No code generated yet'}</code>
                </pre>
              </div>
            ) : (
              <div className="text-center text-xs text-neutral-400 py-20">
                Select a test case to inspect its pytest execution module.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-[#D7D6D0] p-6 max-w-2xl space-y-4">
          <h2 className="text-sm font-bold text-[#171717] uppercase tracking-wide">
            Test Runner Configuration
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#171717] mb-1">Execution Framework</label>
              <input
                type="text"
                disabled
                value="pytest 8.3.2 (Subprocess Sandbox Isolation)"
                className="w-full bg-[#F5F4EF] border border-[#D7D6D0] p-2 font-mono text-neutral-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#171717] mb-1">Execution Timeout</label>
              <input
                type="text"
                disabled
                value="45 seconds per run"
                className="w-full bg-[#F5F4EF] border border-[#D7D6D0] p-2 font-mono text-neutral-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#171717] mb-1">Target Application Host</label>
              <input
                type="text"
                disabled
                value="http://127.0.0.1:8000/demo-target (Commerce API)"
                className="w-full bg-[#F5F4EF] border border-[#D7D6D0] p-2 font-mono text-neutral-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Inspection Drawer for Single Test Case */}
      {inspectedTest && activeTab === 'cases' && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-[#D7D6D0] animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#D7D6D0] flex items-center justify-between bg-[#F5F4EF]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#171717]">
                    {inspectedTest.test_id}
                  </span>
                  <StatusBadge status={inspectedTest.latest_status} size="sm" />
                </div>
                <div className="text-sm font-extrabold text-[#171717] mt-1 font-sans">
                  {inspectedTest.title}
                </div>
              </div>
              <button
                onClick={() => setInspectedTest(null)}
                className="p-1.5 text-[#777777] hover:text-[#171717]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[#FAF9F5] p-3 border border-[#E5E4DE] font-mono">
                <div>
                  <span className="text-[#777777] block text-[10px] uppercase">Requirement</span>
                  <span className="text-[#365CFF] font-semibold">{inspectedTest.linked_req_id || 'None'}</span>
                </div>
                <div>
                  <span className="text-[#777777] block text-[10px] uppercase">Test Type</span>
                  <span className="font-semibold text-[#171717]">{inspectedTest.test_type}</span>
                </div>
                <div>
                  <span className="text-[#777777] block text-[10px] uppercase">Priority</span>
                  <span className="font-semibold text-[#171717]">{inspectedTest.priority}</span>
                </div>
                <div>
                  <span className="text-[#777777] block text-[10px] uppercase">Review Status</span>
                  <span className="font-semibold text-[#16845B]">{inspectedTest.review_status}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#171717] uppercase tracking-wider text-[11px] block mb-1">
                  Expected Outcome
                </label>
                <div className="p-2.5 bg-[#F5F4EF] border border-[#D7D6D0] leading-relaxed">
                  {inspectedTest.expected_outcome}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-[#171717] uppercase tracking-wider text-[11px]">
                    Pytest Executable Code
                  </label>
                  <button
                    onClick={() => handleCopyCode(inspectedTest.generated_code || '')}
                    className="text-[11px] font-mono text-[#365CFF] hover:underline flex items-center gap-1"
                  >
                    {copied ? <Check size={11} /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
                <pre className="font-mono text-xs text-[#E5E5E5] bg-[#171717] p-3 border border-[#262626] overflow-x-auto max-h-72">
                  <code>{inspectedTest.generated_code || '# No code generated'}</code>
                </pre>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#D7D6D0] flex items-center justify-between bg-[#F5F4EF]">
              <button
                onClick={() => setInspectedTest(null)}
                className="px-4 py-2 border border-[#D7D6D0] bg-white text-xs font-semibold text-[#171717]"
              >
                Close
              </button>
              <button
                onClick={() => navigate('/execution')}
                className="px-4 py-2 bg-[#171717] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Play size={12} className="text-[#C8F169]" /> Run Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
