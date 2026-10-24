import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Check,
  X,
  FileText
} from 'lucide-react';
import { Requirement, ChangeImpactResponse, TestCase } from '../../types';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';

interface ChangeImpactPageProps {
  projectId: string;
  requirements: Requirement[];
  loading: boolean;
  onRefresh: () => void;
}

export const ChangeImpactPage: React.FC<ChangeImpactPageProps> = ({
  projectId,
  requirements,
  loading,
  onRefresh
}) => {
  const navigate = useNavigate();

  // Requirement being modified
  const [selectedReqId, setSelectedReqId] = useState<string>(
    requirements.find((r) => r.req_id === 'REQ-003')?.id || (requirements[0]?.id || '')
  );

  const selectedReq = requirements.find((r) => r.id === selectedReqId);

  // Proposed updated text matching screenshot default
  const [newText, setNewText] = useState(
    'Users must be locked out after five failed attempts within 10 minutes.'
  );

  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [impactResult, setImpactResult] = useState<ChangeImpactResponse | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync initial impact analysis
  useEffect(() => {
    if (selectedReq) {
      handleAnalyzeImpact();
    }
  }, [selectedReqId]);

  const handleAnalyzeImpact = async () => {
    if (!selectedReq) return;
    setAnalyzing(true);
    try {
      const res = await api.analyzeChangeImpact({
        requirement_id: selectedReq.id,
        new_text: newText
      });
      setImpactResult(res);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Impact analysis failed' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApproveAndApply = async () => {
    if (!selectedReq || !impactResult) return;
    setApplying(true);
    setFeedbackMsg(null);
    try {
      const applied = await api.approveChangeImpact({
        impact_record_id: impactResult.record_id,
        requirement_id: selectedReq.id,
        new_text: newText,
        auto_regenerate_tests: true
      });
      setImpactResult(applied);
      setFeedbackMsg({
        type: 'success',
        text: `Requirement ${selectedReq.req_id} updated to v${applied.new_version}. Stale tests invalidated and regenerated!`
      });
      onRefresh();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to approve change' });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D7D6D0] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171717] tracking-tight font-sans">
            Change Impact
          </h1>
          <p className="text-sm text-[#555555] mt-1 font-sans">
            Track changes, find affected tests and rerun them.
          </p>
        </div>

        {/* Requirement selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#777777]">Target Requirement:</span>
          <select
            value={selectedReqId}
            onChange={(e) => {
              setSelectedReqId(e.target.value);
              const r = requirements.find((x) => x.id === e.target.value);
              if (r) setNewText(r.original_text);
            }}
            className="bg-white border border-[#D7D6D0] px-3 py-2 text-xs font-mono text-[#171717]"
          >
            {requirements.map((r) => (
              <option key={r.id} value={r.id}>
                {r.req_id}: {r.title} (v{r.current_version})
              </option>
            ))}
          </select>
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

      {/* Primary Split View Matching Screenshot: Left (Updated Requirement), Center (Impact Analysis), Right (Dark Quote Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left: Updated Requirement Card with Old vs New comparison */}
        <div className="bg-white border border-[#D7D6D0] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#777777]">
                Updated Requirement
              </h2>
              <span className="text-xs font-mono text-[#365CFF]">
                {selectedReq?.req_id} &bull; v{selectedReq?.current_version} &rarr; v{(selectedReq?.current_version || 1) + 1}
              </span>
            </div>

            {/* Old requirement box matching screenshot (pink/light-red) */}
            <div className="mb-4">
              <div className="text-[11px] font-mono font-bold text-[#D93D3D] uppercase tracking-wider mb-1">
                Old (Current v{selectedReq?.current_version})
              </div>
              <div className="p-3.5 bg-[#FDEDED] border border-[#F8C8C8] text-xs text-[#171717] font-medium leading-relaxed">
                &ldquo;{selectedReq?.original_text}&rdquo;
              </div>
            </div>

            {/* New requirement box matching screenshot (light-green) */}
            <div>
              <div className="text-[11px] font-mono font-bold text-[#16845B] uppercase tracking-wider mb-1">
                New (Proposed v{(selectedReq?.current_version || 1) + 1})
              </div>
              <textarea
                rows={3}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full p-3 bg-[#EBF7EE] border border-[#C2E7CB] text-xs text-[#171717] font-medium leading-relaxed outline-none focus:border-[#16845B]"
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0F0EE] flex justify-end">
            <button
              onClick={handleAnalyzeImpact}
              disabled={analyzing}
              className="text-xs font-mono text-[#365CFF] hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw size={12} className={analyzing ? 'animate-spin' : ''} />
              {analyzing ? 'Re-calculating diff...' : 'Re-calculate Diff'}
            </button>
          </div>
        </div>

        {/* Center: Impact Analysis Card (Matching Screenshot) */}
        <div className="bg-white border border-[#D7D6D0] p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#777777] mb-4">
              Impact Analysis
            </h2>

            {/* Impact Metric Counters Matching Screenshot */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-[#F5F4EF] border border-[#E5E4DE]">
                <span className="font-semibold text-[#171717] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#365CFF]" />
                  Affected Test Cases
                </span>
                <span className="font-mono font-extrabold text-base text-[#171717]">
                  {impactResult?.affected_test_cases_count || 3}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#F5F4EF] border border-[#E5E4DE]">
                <span className="font-semibold text-[#171717] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                  New Test Cases Needed
                </span>
                <span className="font-mono font-extrabold text-base text-[#171717]">
                  {impactResult?.new_test_cases_needed || 2}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#F5F4EF] border border-[#E5E4DE]">
                <span className="font-semibold text-[#171717] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D93D3D]" />
                  Tests to Rerun
                </span>
                <span className="font-mono font-extrabold text-base text-[#171717]">
                  {impactResult?.tests_to_rerun_count || 3}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#F5F4EF] border border-[#E5E4DE]">
                <span className="font-semibold text-[#777777] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E65100]" />
                  Stale Evidence Invalidated
                </span>
                <span className="font-mono font-bold text-sm text-[#E65100]">
                  {impactResult?.stale_results_count || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Action button: Approve & Apply */}
          <div className="mt-5 pt-3 border-t border-[#F0F0EE]">
            <button
              onClick={handleApproveAndApply}
              disabled={applying || impactResult?.status === 'Applied'}
              className={`w-full py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                impactResult?.status === 'Applied'
                  ? 'bg-[#EBF7EE] text-[#16845B] border border-[#C2E7CB]'
                  : 'bg-[#171717] hover:bg-[#262626] text-white'
              }`}
            >
              {impactResult?.status === 'Applied' ? (
                <>
                  <Check size={14} /> Change Applied (v{(selectedReq?.current_version || 1)})
                </>
              ) : applying ? (
                'Invalidating & Regenerating...'
              ) : (
                <>
                  Approve & Update <ArrowRight size={14} className="text-[#C8F169]" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Editorial Graphic Card: "Change today. Bugs tomorrow (if you don't test)." */}
        <div className="bg-[#171717] text-white border border-[#262626] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-[#C8F169] text-[#C8F169] flex items-center justify-center font-mono text-[10px] font-bold">
              AI
            </div>
            <span className="font-mono text-[10px] tracking-widest uppercase text-neutral-400">
              CHANGE GOVERNANCE
            </span>
          </div>

          <blockquote className="my-auto py-6 text-2xl font-black tracking-tight leading-snug">
            Change today.
            <br />
            <span className="text-[#C8F169]">Bugs tomorrow</span>
            <br />
            <span className="text-neutral-400 text-lg font-normal font-sans">(if you don&apos;t test).</span>
          </blockquote>

          <div className="pt-4 border-t border-[#333333] text-xs font-mono text-neutral-400">
            SPEC2TEST &bull; VERSION-AWARE TEST INVALIDATION
          </div>
        </div>
      </div>

      {/* Affected Tests Detail Table */}
      <div className="bg-white border border-[#D7D6D0] p-6">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#777777] mb-3">
          Affected Test Cases & Required Actions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D7D6D0] bg-[#FAF9F5] text-[#777777] font-mono uppercase text-[11px]">
                <th className="py-2.5 px-3">Test ID</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Required Action</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EE]">
              {(impactResult?.affected_test_cases || []).map((tc) => (
                <tr key={tc.test_id} className="hover:bg-[#FBFBFA]">
                  <td className="py-2.5 px-3 font-mono font-bold text-[#171717]">{tc.test_id}</td>
                  <td className="py-2.5 px-3 text-[#171717]">{tc.title}</td>
                  <td className="py-2.5 px-3 font-mono text-[#555555]">{tc.test_type}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 bg-[#FFF8E1] border border-[#FFE082] text-[#E65100] font-mono text-[10px] uppercase font-bold">
                      {tc.action_required}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => navigate('/execution')}
                      className="text-xs font-mono text-[#365CFF] hover:underline"
                    >
                      Rerun in Lab &rarr;
                    </button>
                  </td>
                </tr>
              ))}
              {(!impactResult?.affected_test_cases || impactResult.affected_test_cases.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-[#777777]">
                    No test cases affected yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
