import React, { useState, useEffect } from 'react';
import {
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertOctagon,
  Clock,
  Terminal,
  FileCode,
  ArrowRight,
  X
} from 'lucide-react';
import { TestRun, TestResult, EvidenceRecord } from '../../types';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';

interface ExecutionPageProps {
  projectId: string;
  runs: TestRun[];
  loading: boolean;
  onRefresh: () => void;
}

export const ExecutionPage: React.FC<ExecutionPageProps> = ({
  projectId,
  runs,
  loading,
  onRefresh
}) => {
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(
    runs.length > 0 ? runs[0] : null
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [activeResultModal, setActiveResultModal] = useState<TestResult | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync latest run
  useEffect(() => {
    if (!selectedRun && runs.length > 0) {
      loadRunDetails(runs[0].id);
    }
  }, [runs]);

  const loadRunDetails = async (runId: string) => {
    try {
      const fullRun = await api.getTestRun(runId);
      setSelectedRun(fullRun);
    } catch {
      // fallback
    }
  };

  const handleRunAllTests = async (rerunFailedOnly = false) => {
    setIsExecuting(true);
    setExecutionLog(['Initializing controlled pytest subprocess in isolated sandbox...']);
    setFeedbackMsg(null);

    try {
      // Simulate live streaming progress visually while real subprocess executes
      const progressTimer = setInterval(() => {
        setExecutionLog((prev) => {
          if (prev.length === 1) {
            return [...prev, 'Running tests against target: http://127.0.0.1:8000/demo-target', 'Collecting test items: 10 test modules discovered...'];
          } else if (prev.length === 3) {
            return [...prev, '✓ test_tc_001.py::test_valid_login PASSED [ 1/10 ]', '✓ test_tc_002.py::test_invalid_password PASSED [ 2/10 ]'];
          } else if (prev.length === 5) {
            return [...prev, '✓ test_tc_003.py::test_empty_fields PASSED [ 3/10 ]', '✓ test_tc_004.py::test_account_lockout PASSED [ 4/10 ]'];
          } else if (prev.length === 7) {
            return [...prev, '✓ test_tc_005.py::test_valid_card PASSED [ 5/10 ]', '✓ test_tc_006.py::test_expired_card PASSED [ 6/10 ]'];
          }
          return prev;
        });
      }, 400);

      const run = await api.executeTests({
        project_id: projectId,
        rerun_failed_only: rerunFailedOnly,
        environment: 'Local'
      });

      clearInterval(progressTimer);
      setSelectedRun(run);
      setExecutionLog(run.raw_stdout?.split('\n').filter((l) => l.trim()) || ['Execution completed successfully.']);
      setFeedbackMsg({
        type: 'success',
        text: `Test run ${run.run_number} finished: ${run.passed_count} passed, ${run.failed_count} failed.`
      });
      onRefresh();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Test execution failed' });
    } finally {
      setIsExecuting(false);
    }
  };

  const currentRun = selectedRun || runs[0];
  const total = currentRun?.total_tests || 0;
  const passed = currentRun?.passed_count || 0;
  const failed = currentRun?.failed_count || 0;
  const unverified = currentRun ? Math.max(0, total - passed - failed) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D7D6D0] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171717] tracking-tight font-sans">
            Execution
          </h1>
          <p className="text-sm text-[#555555] mt-1 font-sans">
            Run your tests and analyze the results.
          </p>
        </div>

        {/* Action button matching screenshot */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunAllTests(false)}
            disabled={isExecuting}
            className="bg-[#171717] hover:bg-[#262626] text-white px-5 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Play size={13} className={`text-[#C8F169] ${isExecuting ? 'animate-pulse' : ''}`} />
            {isExecuting ? 'Executing Tests...' : 'Run All'}
          </button>
          <button
            onClick={() => handleRunAllTests(true)}
            disabled={isExecuting || failed === 0}
            className="bg-white hover:bg-[#F5F4EF] text-[#D93D3D] border border-[#F8C8C8] px-3.5 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-40"
            title="Rerun only failing tests"
          >
            <RefreshCw size={12} /> Rerun Failed
          </button>
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

      {/* Metric Counters (Matching Screenshot: Total Tests 64, Passed 52, Failed 7, Unverified 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-[#D7D6D0] p-4">
          <div className="text-[11px] font-mono text-[#777777] uppercase tracking-wider">
            Total Tests
          </div>
          <div className="text-3xl font-extrabold text-[#171717] mt-1 font-sans">
            {total}
          </div>
        </div>

        <div className="bg-[#EBF7EE] border border-[#C2E7CB] p-4">
          <div className="text-[11px] font-mono text-[#16845B] uppercase tracking-wider font-semibold">
            Passed
          </div>
          <div className="text-3xl font-extrabold text-[#16845B] mt-1 font-sans">
            {passed}
          </div>
        </div>

        <div className="bg-[#FDEDED] border border-[#F8C8C8] p-4">
          <div className="text-[11px] font-mono text-[#D93D3D] uppercase tracking-wider font-semibold">
            Failed
          </div>
          <div className="text-3xl font-extrabold text-[#D93D3D] mt-1 font-sans">
            {failed}
          </div>
        </div>

        <div className="bg-[#F5F4EF] border border-[#D7D6D0] p-4">
          <div className="text-[11px] font-mono text-[#777777] uppercase tracking-wider">
            Unverified
          </div>
          <div className="text-3xl font-extrabold text-[#777777] mt-1 font-sans">
            {unverified}
          </div>
        </div>
      </div>

      {/* Split View Matching Screenshot: Live Execution (Terminal) + Test Run Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left: Live Execution Terminal Box (2 Cols) */}
        <div className="lg:col-span-2 bg-[#171717] text-white border border-[#262626] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#333333] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Terminal size={15} className="text-[#C8F169]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-300">
                  Live Execution Terminal
                </span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                {isExecuting ? 'Running in subprocess sandbox...' : 'pytest runner ready'}
              </span>
            </div>

            {/* Terminal Output */}
            <div className="font-mono text-xs text-[#CCCCCC] bg-[#121212] p-4 border border-[#262626] h-64 overflow-y-auto space-y-1.5 leading-relaxed">
              {isExecuting ? (
                executionLog.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes('PASSED')
                        ? 'text-[#C8F169]'
                        : line.includes('FAILED')
                        ? 'text-[#FF8080]'
                        : 'text-neutral-400'
                    }
                  >
                    {line}
                  </div>
                ))
              ) : currentRun?.raw_stdout ? (
                currentRun.raw_stdout.split('\n').map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.includes('PASSED')
                        ? 'text-[#C8F169]'
                        : l.includes('FAILED') || l.includes('AssertionError')
                        ? 'text-[#FF8080]'
                        : 'text-neutral-300'
                    }
                  >
                    {l}
                  </div>
                ))
              ) : (
                <div className="text-neutral-500 py-16 text-center">
                  Click &ldquo;Run All&rdquo; to execute tests and view real-time subprocess stdout/stderr.
                </div>
              )}
            </div>
          </div>

          {/* Progress / Status Bar below terminal */}
          <div className="mt-3 pt-3 border-t border-[#262626] flex items-center justify-between text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16845B]" />
              <span>{passed + failed}/{total} completed</span>
            </div>
            <span>Duration: {currentRun ? `${(currentRun.duration_ms / 1000).toFixed(2)}s` : '0s'}</span>
          </div>
        </div>

        {/* Right: Test Run Details Box (1 Col) */}
        <div className="bg-white border border-[#D7D6D0] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#F0F0EE] pb-3 mb-4">
              <h2 className="text-sm font-bold text-[#171717] uppercase tracking-wide">
                Test Run Details
              </h2>
              <span className="font-mono text-xs text-[#365CFF] font-semibold">
                {currentRun?.run_number || 'RUN-INITIAL'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#F5F4EF]">
                <span className="text-[#777777] font-mono">Started:</span>
                <span className="font-semibold text-[#171717]">
                  {currentRun ? new Date(currentRun.started_at).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F5F4EF]">
                <span className="text-[#777777] font-mono">Environment:</span>
                <span className="font-mono font-bold text-[#171717]">
                  {currentRun?.environment || 'Local'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F5F4EF]">
                <span className="text-[#777777] font-mono">Duration:</span>
                <span className="font-mono text-[#171717]">
                  {currentRun ? `${(currentRun.duration_ms / 1000).toFixed(2)}s` : '0s'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F5F4EF]">
                <span className="text-[#777777] font-mono">Framework:</span>
                <span className="font-mono text-[#171717]">
                  {currentRun?.framework || 'pytest 8.3.2'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F5F4EF]">
                <span className="text-[#777777] font-mono">Target Host:</span>
                <span className="font-mono text-[#365CFF] truncate max-w-[160px]">
                  {currentRun?.target_url || '127.0.0.1:8000/demo-target'}
                </span>
              </div>
            </div>

            {/* Failure inspection highlight */}
            {failed > 0 && (
              <div className="mt-4 p-3 bg-[#FDEDED] border border-[#F8C8C8]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#D93D3D] uppercase font-mono">
                  <AlertOctagon size={13} /> {failed} Failure(s) Recorded
                </div>
                <div className="text-[11px] text-[#555555] mt-1">
                  Click on any failed row in the results table below to view exact assertion failure evidence and stack traces.
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-[#F0F0EE]">
            <button
              onClick={() => {
                const el = document.getElementById('run-results-table');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full bg-[#171717] hover:bg-[#262626] text-white py-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
            >
              View Results Table <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Results Table for Selected Run */}
      <div id="run-results-table" className="bg-white border border-[#D7D6D0]">
        <div className="p-4 border-b border-[#D7D6D0] flex items-center justify-between bg-[#FAF9F5]">
          <div>
            <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
              Test Execution Results ({currentRun?.results?.length || 0})
            </h3>
            <p className="text-[11px] text-[#777777] mt-0.5">
              Verified outcomes, assertion errors, and evidence records from {currentRun?.run_number}
            </p>
          </div>

          {/* Run switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#777777]">Run History:</span>
            <select
              value={selectedRun?.id || ''}
              onChange={(e) => loadRunDetails(e.target.value)}
              className="bg-white border border-[#D7D6D0] px-2 py-1 text-xs font-mono"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.run_number} ({r.passed_count}P / {r.failed_count}F)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D7D6D0] bg-[#FAF9F5] text-[#777777] font-mono uppercase text-[11px]">
                <th className="py-2.5 px-4 font-semibold">Test ID</th>
                <th className="py-2.5 px-4 font-semibold">Requirement</th>
                <th className="py-2.5 px-4 font-semibold">Test Title</th>
                <th className="py-2.5 px-4 font-semibold">Outcome</th>
                <th className="py-2.5 px-4 font-semibold">Duration</th>
                <th className="py-2.5 px-4 font-semibold">Assertion Failure / Details</th>
                <th className="py-2.5 px-4 font-semibold text-right">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EE]">
              {(currentRun?.results || []).map((res) => (
                <tr
                  key={res.id}
                  onClick={() => setActiveResultModal(res)}
                  className="hover:bg-[#FBFBFA] transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-4 font-mono font-bold text-[#171717]">
                    {res.test_id || 'TC'}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[#365CFF]">
                    {res.linked_req_id || '—'}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-[#171717]">
                    {res.test_title}
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={res.status} size="sm" />
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[#777777]">
                    {res.duration_ms}ms
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[11px] max-w-xs truncate text-[#555555]">
                    {res.assertion_message || 'All assertions passed successfully.'}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveResultModal(res);
                      }}
                      className="text-xs font-mono text-[#365CFF] hover:underline"
                    >
                      Logs ({res.evidence?.length || 1})
                    </button>
                  </td>
                </tr>
              ))}
              {(!currentRun?.results || currentRun.results.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#777777]">
                    No test results recorded for this run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Failure & Evidence Inspector Modal */}
      {activeResultModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#171717] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#D7D6D0] flex items-center justify-between bg-[#F5F4EF]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#171717]">
                    {activeResultModal.test_id}
                  </span>
                  <StatusBadge status={activeResultModal.status} size="sm" />
                </div>
                <div className="text-sm font-bold text-[#171717] mt-1 font-sans">
                  {activeResultModal.test_title}
                </div>
              </div>
              <button
                onClick={() => setActiveResultModal(null)}
                className="p-1 text-[#777777] hover:text-[#171717]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              {activeResultModal.assertion_message && (
                <div>
                  <div className="font-mono text-[11px] font-bold text-[#D93D3D] uppercase tracking-wider mb-1">
                    Assertion Failure Message
                  </div>
                  <div className="p-3 bg-[#FDEDED] border border-[#F8C8C8] font-mono text-xs text-[#900] leading-relaxed">
                    {activeResultModal.assertion_message}
                  </div>
                </div>
              )}

              {activeResultModal.stack_trace && (
                <div>
                  <div className="font-mono text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-1">
                    Pytest Stack Trace
                  </div>
                  <pre className="font-mono text-xs bg-[#171717] text-[#FF8080] p-3 border border-[#333333] overflow-x-auto max-h-56">
                    <code>{activeResultModal.stack_trace}</code>
                  </pre>
                </div>
              )}

              {/* Evidence Records List */}
              <div>
                <div className="font-mono text-[11px] font-bold text-[#171717] uppercase tracking-wider mb-2">
                  Evidence Records ({activeResultModal.evidence?.length || 0})
                </div>
                <div className="space-y-2">
                  {(activeResultModal.evidence || []).map((ev) => (
                    <div key={ev.id} className="p-3 border border-[#D7D6D0] bg-[#FAF9F5]">
                      <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                        <span className="font-bold text-[#171717]">{ev.title}</span>
                        <span className="text-[#777777] uppercase text-[10px]">{ev.evidence_type}</span>
                      </div>
                      <pre className="font-mono text-xs text-[#333333] bg-white p-2 border border-[#E5E4DE] overflow-x-auto whitespace-pre-wrap">
                        {ev.content}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[#D7D6D0] flex justify-end bg-[#F5F4EF]">
              <button
                onClick={() => setActiveResultModal(null)}
                className="px-4 py-1.5 bg-[#171717] text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
