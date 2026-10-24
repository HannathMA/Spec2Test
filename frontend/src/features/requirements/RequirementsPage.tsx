import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Check,
  X,
  ArrowRight,
  Plus,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Edit2,
  Edit3,
  Clock,
  Trash2,
  Save,
  CheckSquare,
  Square,
  FlaskConical
} from 'lucide-react';
import { Requirement, AcceptanceCriterion, AnalysisFinding } from '../../types';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';

interface RequirementsPageProps {
  projectId: string;
  requirements: Requirement[];
  loading: boolean;
  onRefresh: () => void;
}

export const RequirementsPage: React.FC<RequirementsPageProps> = ({
  projectId,
  requirements,
  loading,
  onRefresh
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected requirement for inspection & refinement
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(
    requirements.length > 0 ? requirements[0] : null
  );

  // Text paste input mode (default true so user can immediately write requirements)
  const [pasteMode, setPasteMode] = useState(true);
  const [reqTitle, setReqTitle] = useState('');
  const [reqText, setReqText] = useState('');
  const [reqPriority, setReqPriority] = useState('High');
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Developer Review state
  const [editingCritId, setEditingCritId] = useState<string | null>(null);
  const [editCritText, setEditCritText] = useState('');
  const [regeneratingCritId, setRegeneratingCritId] = useState<string | null>(null);
  const [showAddCritModal, setShowAddCritModal] = useState(false);
  const [newCritText, setNewCritText] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  // Table row selection & test conversion state
  const [selectedCritIds, setSelectedCritIds] = useState<string[]>([]);
  const [convertingToTests, setConvertingToTests] = useState(false);

  const handleSelectRequirement = async (req: Requirement) => {
    setSelectedReq(req);
    try {
      const full = await api.getRequirement(req.id);
      if (full) {
        setSelectedReq(full);
      }
    } catch (err) {
      console.error('Failed to load full requirement:', err);
    }
  };

  // Synchronize selection when requirement changes
  React.useEffect(() => {
    if (selectedReq?.acceptance_criteria && selectedReq.acceptance_criteria.length > 0) {
      // Pre-select approved criteria, or select all if none approved yet
      const approvedIds = selectedReq.acceptance_criteria
        .filter(c => c.review_status === 'approved' || (c.review_status !== 'rejected' && c.is_approved))
        .map(c => c.id);
      if (approvedIds.length > 0) {
        setSelectedCritIds(approvedIds);
      } else {
        setSelectedCritIds(selectedReq.acceptance_criteria.map(c => c.id));
      }
    } else {
      setSelectedCritIds([]);
    }
  }, [selectedReq?.id, selectedReq?.acceptance_criteria]);

  // Ensure full requirement with criteria is fetched if missing
  React.useEffect(() => {
    if (selectedReq?.id) {
      if (!selectedReq.acceptance_criteria || selectedReq.acceptance_criteria.length === 0) {
        api.getRequirement(selectedReq.id)
          .then((full) => {
            if (full && full.acceptance_criteria && full.acceptance_criteria.length > 0) {
              setSelectedReq(full);
            }
          })
          .catch(console.error);
      }
    }
  }, [selectedReq?.id]);

  // Active requirement when requirements change
  React.useEffect(() => {
    if (!selectedReq && requirements.length > 0) {
      handleSelectRequirement(requirements[0]);
    } else if (selectedReq) {
      const updated = requirements.find((r) => r.id === selectedReq.id);
      if (updated) {
        if (!updated.acceptance_criteria || updated.acceptance_criteria.length === 0) {
          handleSelectRequirement(updated);
        } else {
          setSelectedReq(updated);
        }
      }
    }
  }, [requirements]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const newReq = await api.uploadRequirementFile(projectId, file);
      setFeedbackMsg({
        type: 'success',
        text: `Document '${file.name}' ingested and analyzed! Acceptance criteria have been automatically formulated in rows and columns below. Select what you need to convert into test cases.`
      });
      onRefresh();
      setSelectedReq(newReq);
      setTimeout(() => {
        const el = document.getElementById('refined-criteria-section');
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to upload document' });
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateTextRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqText.trim()) return;

    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const newReq = await api.createRequirement({
        project_id: projectId,
        title: reqTitle.trim() || 'Untitled Requirement',
        original_text: reqText.trim(),
        priority: reqPriority
      });
      setFeedbackMsg({
        type: 'success',
        text: `Requirement ${newReq.req_id} saved and analyzed! Acceptance criteria have been automatically implemented in rows and columns below. Select the items you need and click "Convert Selected to Test Cases".`
      });
      setReqTitle('');
      setReqText('');
      onRefresh();
      setSelectedReq(newReq);
      setTimeout(() => {
        const el = document.getElementById('refined-criteria-section');
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to create requirement' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!selectedReq) return;
    setAnalyzing(true);
    try {
      const updated = await api.analyzeRequirement(selectedReq.id);
      setSelectedReq(updated);
      onRefresh();
      setFeedbackMsg({ type: 'success', text: `Analysis complete for ${selectedReq.req_id}.` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Analysis failed' });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSetCriterionStatus = async (crit: AcceptanceCriterion, review_status: 'approved' | 'rejected' | 'pending') => {
    try {
      const updated = await api.updateCriterion(crit.id, { review_status });
      if (selectedReq) {
        const nextCriteria = (selectedReq.acceptance_criteria || []).map((c) =>
          c.id === crit.id ? updated : c
        );
        setSelectedReq({ ...selectedReq, acceptance_criteria: nextCriteria });
      }
      onRefresh();
      setFeedbackMsg({
        type: 'success',
        text: `Criterion ${crit.criterion_id} marked as ${review_status.toUpperCase()}.`
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update review status' });
    }
  };

  const handleStartEditCriterion = (crit: AcceptanceCriterion) => {
    setEditingCritId(crit.id);
    setEditCritText(crit.criterion_text);
  };

  const handleSaveEditCriterion = async (critId: string) => {
    if (!editCritText.trim()) return;
    setSavingAction(true);
    try {
      const updated = await api.updateCriterion(critId, { criterion_text: editCritText.trim() });
      if (selectedReq) {
        const nextCriteria = (selectedReq.acceptance_criteria || []).map((c) =>
          c.id === critId ? updated : c
        );
        setSelectedReq({ ...selectedReq, acceptance_criteria: nextCriteria });
      }
      setEditingCritId(null);
      setEditCritText('');
      onRefresh();
      setFeedbackMsg({ type: 'success', text: `Criterion updated successfully.` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to save edits' });
    } finally {
      setSavingAction(false);
    }
  };

  const handleRegenerateCriterion = async (crit: AcceptanceCriterion) => {
    setRegeneratingCritId(crit.id);
    try {
      const regenerated = await api.regenerateCriterion(crit.id);
      if (selectedReq) {
        const nextCriteria = (selectedReq.acceptance_criteria || []).map((c) =>
          c.id === crit.id ? regenerated : c
        );
        setSelectedReq({ ...selectedReq, acceptance_criteria: nextCriteria });
      }
      onRefresh();
      setFeedbackMsg({
        type: 'success',
        text: `Criterion ${crit.criterion_id} regenerated via AI and set to pending review.`
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Regeneration failed' });
    } finally {
      setRegeneratingCritId(null);
    }
  };

  const handleDeleteCriterion = async (critId: string) => {
    try {
      await api.deleteCriterion(critId);
      if (selectedReq) {
        const nextCriteria = (selectedReq.acceptance_criteria || []).filter((c) => c.id !== critId);
        setSelectedReq({ ...selectedReq, acceptance_criteria: nextCriteria });
      }
      onRefresh();
      setFeedbackMsg({ type: 'success', text: `Criterion deleted.` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to delete criterion' });
    }
  };

  const handleAddCustomCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCritText.trim() || !selectedReq) return;
    setSavingAction(true);
    try {
      const added = await api.createCriterion(selectedReq.id, {
        criterion_text: newCritText.trim(),
        review_status: 'pending'
      });
      const nextCriteria = [...(selectedReq.acceptance_criteria || []), added];
      setSelectedReq({ ...selectedReq, acceptance_criteria: nextCriteria });
      setNewCritText('');
      setShowAddCritModal(false);
      onRefresh();
      setFeedbackMsg({ type: 'success', text: `New acceptance criterion ${added.criterion_id} added.` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to add criterion' });
    } finally {
      setSavingAction(false);
    }
  };

  const handleBatchReview = async (approve: boolean) => {
    if (!selectedReq?.acceptance_criteria || selectedReq.acceptance_criteria.length === 0) return;
    const ids = selectedReq.acceptance_criteria.map((c) => c.id);
    try {
      await api.batchApproveCriteria(selectedReq.id, ids, approve);
      const refreshed = await api.getRequirement(selectedReq.id);
      setSelectedReq(refreshed);
      onRefresh();
      setFeedbackMsg({
        type: 'success',
        text: approve
          ? `All criteria approved for ${selectedReq.req_id}. Ready for test generation.`
          : `All criteria rejected for ${selectedReq.req_id}.`
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update criteria batch' });
    }
  };

  const handleToggleSelectCriterion = (critId: string) => {
    setSelectedCritIds(prev =>
      prev.includes(critId) ? prev.filter(id => id !== critId) : [...prev, critId]
    );
  };

  const allCritIds = (selectedReq?.acceptance_criteria || []).map(c => c.id);
  const isAllSelected = allCritIds.length > 0 && allCritIds.every(id => selectedCritIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCritIds([]);
    } else {
      setSelectedCritIds(allCritIds);
    }
  };

  const handleApproveSelected = async () => {
    if (!selectedReq || selectedCritIds.length === 0) return;
    try {
      await api.batchApproveCriteria(selectedReq.id, selectedCritIds, true);
      const refreshed = await api.getRequirement(selectedReq.id);
      setSelectedReq(refreshed);
      onRefresh();
      setFeedbackMsg({
        type: 'success',
        text: `Approved ${selectedCritIds.length} selected criteria.`
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to approve selected criteria' });
    }
  };

  const handleRejectSelected = async () => {
    if (!selectedReq || selectedCritIds.length === 0) return;
    try {
      await api.batchApproveCriteria(selectedReq.id, selectedCritIds, false);
      const refreshed = await api.getRequirement(selectedReq.id);
      setSelectedReq(refreshed);
      onRefresh();
      setFeedbackMsg({
        type: 'success',
        text: `Rejected ${selectedCritIds.length} selected criteria.`
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to reject selected criteria' });
    }
  };

  const handleConvertSelectedToTests = async () => {
    if (!selectedReq) return;
    if (selectedCritIds.length === 0) {
      setFeedbackMsg({
        type: 'error',
        text: 'Please select at least one acceptance criterion in the table to convert into test cases.'
      });
      return;
    }

    setConvertingToTests(true);
    setFeedbackMsg(null);
    try {
      // 1. Mark selected criteria as 'approved' in backend database
      await api.batchApproveCriteria(selectedReq.id, selectedCritIds, true);

      // 2. Mark unselected criteria for this requirement as 'rejected' so ONLY needed ones become tests
      const unselectedIds = (selectedReq.acceptance_criteria || [])
        .map(c => c.id)
        .filter(id => !selectedCritIds.includes(id));
      if (unselectedIds.length > 0) {
        await api.batchApproveCriteria(selectedReq.id, unselectedIds, false);
      }

      // 3. Synthesize test cases for this requirement
      const generated = await api.generateTestCases(projectId, selectedReq.id, true);

      onRefresh();
      // 4. Navigate directly to Test Lab with newly converted test cases
      navigate('/test-lab');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to convert criteria to test cases' });
      setConvertingToTests(false);
    }
  };

  const renderCriterionStepFormat = (text: string) => {
    const match = text.match(/Given\s+(.*?)[,.]\s*When\s+(.*?)[,.]\s*Then\s+(.*)/i);
    if (match) {
      const [, given, when, then] = match;
      return (
        <div className="space-y-1.5 py-0.5">
          <div className="text-xs text-[#171717] font-sans flex items-start gap-2">
            <span className="font-bold text-[#365CFF] font-mono text-[10px] bg-[#EEF2FF] border border-[#C7D7FE] px-1.5 py-0.5 uppercase tracking-wider shrink-0 mt-0.5">
              Given
            </span>
            <span className="leading-snug">{given}</span>
          </div>
          <div className="text-xs text-[#171717] font-sans flex items-start gap-2">
            <span className="font-bold text-[#D97706] font-mono text-[10px] bg-[#FEF3C7] border border-[#FDE68A] px-1.5 py-0.5 uppercase tracking-wider shrink-0 mt-0.5">
              When
            </span>
            <span className="leading-snug">{when}</span>
          </div>
          <div className="text-xs text-[#171717] font-sans flex items-start gap-2">
            <span className="font-bold text-[#16845B] font-mono text-[10px] bg-[#EBF7EE] border border-[#C2E7CB] px-1.5 py-0.5 uppercase tracking-wider shrink-0 mt-0.5">
              Then
            </span>
            <span className="leading-snug">{then}</span>
          </div>
        </div>
      );
    }
    return <div className="text-xs text-[#171717] font-medium leading-relaxed font-sans">{text}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D7D6D0] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171717] tracking-tight font-sans">
            Requirements
          </h1>
          <p className="text-sm text-[#555555] mt-1 font-sans">
            Turn natural language into measurable acceptance criteria.
          </p>
        </div>

        {/* Workflow Stepper Matching Screenshot: (1) Upload -> (2) Analyze -> (3) Refine -> (4) Approve */}
        <div className="flex items-center gap-1.5 sm:gap-3 bg-white border border-[#D7D6D0] px-3 py-2 text-xs font-mono text-[#777777]">
          <span className="flex items-center gap-1 font-bold text-[#365CFF]">
            <span className="w-4 h-4 rounded-full border border-[#365CFF] flex items-center justify-center text-[10px]">1</span>
            Upload
          </span>
          <span className="text-[#D7D6D0]">&bull;</span>
          <span className="flex items-center gap-1 font-bold text-[#171717]">
            <span className="w-4 h-4 rounded-full border border-[#171717] flex items-center justify-center text-[10px]">2</span>
            Analyze
          </span>
          <span className="text-[#D7D6D0]">&bull;</span>
          <span className="flex items-center gap-1 text-[#777777]">
            <span className="w-4 h-4 rounded-full border border-[#D7D6D0] flex items-center justify-center text-[10px]">3</span>
            Refine
          </span>
          <span className="text-[#D7D6D0]">&bull;</span>
          <span className="flex items-center gap-1 text-[#777777]">
            <span className="w-4 h-4 rounded-full border border-[#D7D6D0] flex items-center justify-center text-[10px]">4</span>
            Approve
          </span>
        </div>
      </div>

      {/* Alert banner if any */}
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

      {/* Ingestion & Analysis Section: Split Cards (Left: Upload/Paste, Right: AI Analysis Box) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Card: Drop a file or paste requirements */}
        <div className="bg-white border border-[#D7D6D0] p-6 flex flex-col justify-between">
          <div>
            {/* Segmented Ingestion Tabs */}
            <div className="flex items-center justify-between mb-4 border-b border-[#ECEBE4] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#777777]">
                Ingestion Method
              </span>
              <div className="inline-flex p-0.5 bg-[#F5F4EF] border border-[#D7D6D0]">
                <button
                  type="button"
                  onClick={() => setPasteMode(true)}
                  className={`px-3 py-1 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
                    pasteMode
                      ? 'bg-[#171717] text-white shadow-xs'
                      : 'text-[#666666] hover:text-[#171717]'
                  }`}
                >
                  <Edit3 size={12} /> Write / Paste
                </button>
                <button
                  type="button"
                  onClick={() => setPasteMode(false)}
                  className={`px-3 py-1 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
                    !pasteMode
                      ? 'bg-[#171717] text-white shadow-xs'
                      : 'text-[#666666] hover:text-[#171717]'
                  }`}
                >
                  <UploadCloud size={12} /> Upload File
                </button>
              </div>
            </div>

            {!pasteMode ? (
              <div className="border-2 border-dashed border-[#D7D6D0] hover:border-[#171717] p-8 text-center bg-[#FBFBFA] transition-colors flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[#EEF2FF] text-[#365CFF] flex items-center justify-center mb-3">
                  <FileText size={24} />
                </div>
                <div className="text-sm font-bold text-[#171717]">
                  Drop a file or paste your requirements
                </div>
                <div className="text-xs text-[#777777] mt-1 font-mono">
                  Supports .pdf, .docx, .txt, .md (Max 10MB)
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.txt,.md"
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-5 bg-[#171717] hover:bg-[#262626] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Extracting Text...' : 'Upload File'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateTextRequirement} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#171717] uppercase tracking-wide mb-1">
                    Requirement Title
                  </label>
                  <input
                    type="text"
                    required
                    value={reqTitle}
                    onChange={(e) => setReqTitle(e.target.value)}
                    placeholder="e.g. Account Lockout SLA"
                    className="w-full bg-[#F5F4EF] border border-[#D7D6D0] px-3 py-2 text-xs text-[#171717] outline-none focus:border-[#365CFF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#171717] uppercase tracking-wide mb-1">
                    Natural Language Text
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reqText}
                    onChange={(e) => setReqText(e.target.value)}
                    placeholder="Describe requirement in natural language... (e.g. Users must be locked out after 3 failed login attempts.)"
                    className="w-full bg-[#F5F4EF] border border-[#D7D6D0] p-3 text-xs text-[#171717] outline-none focus:border-[#365CFF]"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <select
                    value={reqPriority}
                    onChange={(e) => setReqPriority(e.target.value)}
                    className="bg-[#F5F4EF] border border-[#D7D6D0] px-2.5 py-1.5 text-xs font-mono"
                  >
                    <option value="High">Priority: High</option>
                    <option value="Medium">Priority: Medium</option>
                    <option value="Low">Priority: Low</option>
                  </select>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#171717] hover:bg-[#262626] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Analyzing...' : 'Save & Analyze'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick switcher of existing requirements */}
          <div className="mt-5 pt-4 border-t border-[#F0F0EE]">
            <div className="text-[11px] font-mono text-[#777777] uppercase tracking-wider mb-2">
              Select Requirement to Inspect:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {requirements.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRequirement(r)}
                  className={`px-2 py-1 text-xs font-mono border transition-colors ${
                    selectedReq?.id === r.id
                      ? 'bg-[#171717] text-white border-[#171717]'
                      : 'bg-white text-[#171717] border-[#D7D6D0] hover:border-[#171717]'
                  }`}
                >
                  {r.req_id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Card: AI Analysis Box (Matching Screenshot) */}
        <div className="bg-white border border-[#D7D6D0] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#365CFF]" />
                <h2 className="text-sm font-bold text-[#171717] uppercase tracking-wide">
                  AI Analysis Findings
                </h2>
              </div>
              <button
                onClick={handleTriggerAnalysis}
                disabled={analyzing || !selectedReq}
                className="text-xs font-mono text-[#365CFF] hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw size={12} className={analyzing ? 'animate-spin' : ''} />
                {analyzing ? 'Analyzing...' : 'Re-run Analysis'}
              </button>
            </div>

            {selectedReq ? (
              <div className="space-y-3">
                <div className="bg-[#F5F4EF] p-3 border border-[#E5E4DE]">
                  <div className="text-xs font-bold text-[#171717]">
                    {selectedReq.req_id} &bull; {selectedReq.title}
                  </div>
                  <div className="text-xs text-[#555555] mt-1 italic">
                    &ldquo;{selectedReq.original_text}&rdquo;
                  </div>
                </div>

                {/* Findings list matching screenshot format */}
                <div className="space-y-2.5 mt-3">
                  {(selectedReq.findings || []).map((finding) => (
                    <div
                      key={finding.id}
                      className="border border-[#D7D6D0] p-3 bg-white flex items-start gap-2.5"
                    >
                      <AlertTriangle
                        size={15}
                        className={`flex-shrink-0 mt-0.5 ${
                          finding.severity === 'high'
                            ? 'text-[#D93D3D]'
                            : finding.severity === 'medium'
                            ? 'text-[#F59E0B]'
                            : 'text-[#365CFF]'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#171717]">
                            {finding.title}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1 border border-[#D7D6D0] text-[#777777]">
                            {finding.severity}
                          </span>
                        </div>
                        <div className="text-xs text-[#666666] mt-0.5">
                          {finding.explanation}
                        </div>
                        {finding.suggested_clarification && (
                          <div className="mt-1.5 text-[11px] font-mono text-[#365CFF] bg-[#F0F4FF] p-1.5 border border-[#D0DDFF]">
                            <strong>Suggested fix:</strong> {finding.suggested_clarification}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!selectedReq.findings || selectedReq.findings.length === 0) && (
                    <div className="p-4 text-center text-xs text-[#777777] border border-dashed border-[#D7D6D0]">
                      No ambiguity issues identified. Requirement passes baseline testability checks.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#777777] text-center py-10">
                Select or upload a requirement to view quality findings.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0F0EE] flex justify-end">
            <button
              onClick={() => {
                const el = document.getElementById('refined-criteria-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-[#171717] hover:underline flex items-center gap-1 font-mono"
            >
              View full analysis &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Acceptance Criteria in Rows & Columns (Like Test Cases Table) */}
      <div id="refined-criteria-section" className="space-y-6">
        <div className="bg-white border border-[#D7D6D0] p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#171717] uppercase tracking-wide font-sans">
                  Acceptance Criteria Specification &bull; Developer Selection Table
                </h2>
                <span className="text-[10px] font-mono bg-[#EBF7EE] text-[#16845B] border border-[#C2E7CB] px-1.5 py-0.5 font-bold uppercase">
                  Automatic AI Formulation
                </span>
              </div>
              <p className="text-xs text-[#777777] mt-0.5 font-sans">
                Select the criteria you need below. Only selected and approved criteria will be converted into executable test cases.
              </p>
            </div>

            {/* Header Action Tools */}
            <div className="flex items-center flex-wrap gap-2">
              <button
                onClick={() => setShowAddCritModal(true)}
                className="px-2.5 py-1.5 text-xs font-mono font-semibold bg-[#F5F4EF] hover:bg-[#EAE8E0] text-[#171717] border border-[#D7D6D0] flex items-center gap-1 transition-colors"
              >
                <Plus size={13} /> Add Criterion
              </button>
              {selectedReq?.acceptance_criteria && selectedReq.acceptance_criteria.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleBatchReview(true)}
                    className="px-2.5 py-1.5 text-xs font-mono font-semibold bg-[#EBF7EE] hover:bg-[#DCF3E1] text-[#16845B] border border-[#C2E7CB] flex items-center gap-1 transition-colors"
                    title="Approve all criteria"
                  >
                    <Check size={12} /> Approve All
                  </button>
                  <button
                    onClick={() => handleBatchReview(false)}
                    className="px-2.5 py-1.5 text-xs font-mono font-semibold bg-[#FDEDED] hover:bg-[#F9DADA] text-[#D93D3D] border border-[#F8C8C8] flex items-center gap-1 transition-colors"
                    title="Reject all criteria"
                  >
                    <X size={12} /> Reject All
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Criteria Status Breakdown & Gate Callout */}
          {selectedReq?.acceptance_criteria && selectedReq.acceptance_criteria.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center flex-wrap gap-3 bg-[#FAF9F5] border border-[#E5E4DE] px-3.5 py-2 text-xs font-mono">
                <span className="text-[#777777] font-bold">CRITERIA STATUS:</span>
                <span className="inline-flex items-center gap-1 text-[#16845B] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#16845B]"></span>
                  {selectedReq.acceptance_criteria.filter(c => c.review_status === 'approved' || (c.review_status !== 'rejected' && c.is_approved)).length} Approved
                </span>
                <span className="text-[#D7D6D0]">&bull;</span>
                <span className="inline-flex items-center gap-1 text-[#B76E00] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#FFE699]"></span>
                  {selectedReq.acceptance_criteria.filter(c => c.review_status === 'pending' || (!c.review_status && !c.is_approved)).length} Pending
                </span>
                <span className="text-[#D7D6D0]">&bull;</span>
                <span className="inline-flex items-center gap-1 text-[#D93D3D] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#D93D3D]"></span>
                  {selectedReq.acceptance_criteria.filter(c => c.review_status === 'rejected').length} Rejected
                </span>
              </div>

              {/* Selection & Test Conversion Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#171717] text-white p-3.5 border border-[#171717]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-[#C8F169] flex items-center gap-1.5">
                    <CheckSquare size={14} />
                    {selectedCritIds.length} of {selectedReq.acceptance_criteria.length} CRITERIA SELECTED
                  </span>
                  <span className="text-[#444444] hidden sm:inline">|</span>
                  <span className="text-xs text-[#AAAAAA] hidden md:inline">
                    Check the criteria you need below, then convert into tests
                  </span>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <button
                    onClick={handleApproveSelected}
                    disabled={selectedCritIds.length === 0}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-[#262626] hover:bg-[#333333] text-white border border-[#444444] flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    title="Mark selected criteria as Approved"
                  >
                    <Check size={12} className="text-[#C8F169]" /> Approve Selected
                  </button>

                  <button
                    onClick={handleRejectSelected}
                    disabled={selectedCritIds.length === 0}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-[#262626] hover:bg-[#333333] text-[#F87171] border border-[#444444] flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    title="Mark selected criteria as Rejected"
                  >
                    <X size={12} /> Reject Selected
                  </button>

                  <button
                    onClick={handleConvertSelectedToTests}
                    disabled={selectedCritIds.length === 0 || convertingToTests}
                    className="px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-[#365CFF] hover:bg-[#254ADB] text-white flex items-center gap-1.5 transition-colors disabled:opacity-40 shadow-sm"
                    title="Convert checked criteria into executable test cases"
                  >
                    <FlaskConical size={13} className={convertingToTests ? 'animate-spin' : 'text-[#C8F169]'} />
                    {convertingToTests ? 'Synthesizing Tests...' : 'Convert Selected to Test Cases'}
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Criteria Table: Rows and Columns Format (Like Test Cases Table) */}
          {selectedReq?.acceptance_criteria && selectedReq.acceptance_criteria.length > 0 ? (
            <div className="border border-[#D7D6D0] overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#D7D6D0] bg-[#FAF9F5] text-[#777777] font-mono uppercase text-[11px]">
                      <th className="py-3 px-3 w-10 text-center">
                        <button
                          onClick={handleToggleSelectAll}
                          className="p-1 hover:text-[#171717] transition-colors inline-flex items-center justify-center"
                          title={isAllSelected ? "Deselect All Criteria" : "Select All Criteria"}
                        >
                          {isAllSelected ? (
                            <CheckSquare size={16} className="text-[#365CFF]" />
                          ) : (
                            <Square size={16} className="text-[#999999]" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3 font-semibold font-mono w-24">ID</th>
                      <th className="py-3 px-4 font-semibold">Acceptance Criterion Specification</th>
                      <th className="py-3 px-3 font-semibold font-mono w-28">Format</th>
                      <th className="py-3 px-3 font-semibold text-center w-36">Review Status</th>
                      <th className="py-3 px-4 font-semibold text-right w-64">Individual Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0F0EE]">
                    {selectedReq.acceptance_criteria.map((crit) => {
                      const isSelected = selectedCritIds.includes(crit.id);
                      const isApproved = crit.review_status === 'approved' || (crit.review_status !== 'rejected' && crit.is_approved);
                      const isRejected = crit.review_status === 'rejected';
                      const isPending = !isApproved && !isRejected;

                      return (
                        <tr
                          key={crit.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-[#F4F7FF]' : 'hover:bg-[#FBFBFA]'
                          }`}
                        >
                          {/* Checkbox column */}
                          <td className="py-3 px-3 text-center align-top pt-3.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleSelectCriterion(crit.id)}
                              className="p-1 hover:text-[#171717] transition-colors inline-flex items-center justify-center"
                              title={isSelected ? "Unselect this criterion" : "Select this criterion to convert into test cases"}
                            >
                              {isSelected ? (
                                <CheckSquare size={16} className="text-[#365CFF]" />
                              ) : (
                                <Square size={16} className="text-[#BBBBBB]" />
                              )}
                            </button>
                          </td>

                          {/* ID column */}
                          <td className="py-3 px-3 font-mono font-bold text-[#171717] align-top pt-3.5">
                            <span className="bg-[#F0EFEA] px-1.5 py-0.5 border border-[#E0DFD8] text-[11px]">
                              {crit.criterion_id}
                            </span>
                          </td>

                          {/* Criterion text or Inline Editor */}
                          <td className="py-3 px-4 align-top">
                            {editingCritId === crit.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editCritText}
                                  onChange={(e) => setEditCritText(e.target.value)}
                                  className="w-full text-xs font-mono p-2.5 border border-[#171717] bg-[#FAF9F5] focus:outline-none focus:ring-1 focus:ring-[#171717] resize-y min-h-[75px]"
                                  placeholder="Given [precondition], When [action], Then [expected outcome]"
                                />
                                <div className="flex items-center gap-2 justify-end">
                                  <button
                                    onClick={() => setEditingCritId(null)}
                                    disabled={savingAction}
                                    className="px-2.5 py-1 text-xs font-mono border border-[#D7D6D0] bg-white hover:bg-[#F5F4EF] text-[#666666]"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveEditCriterion(crit.id)}
                                    disabled={savingAction || !editCritText.trim()}
                                    className="px-3 py-1 text-xs font-mono uppercase tracking-wider font-bold bg-[#171717] text-white hover:bg-[#262626] flex items-center gap-1"
                                  >
                                    <Save size={12} /> Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {renderCriterionStepFormat(crit.criterion_text)}
                                <div className="text-[10px] font-mono text-[#888888] pt-0.5">
                                  Version: v{crit.version_number || 1}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Format column */}
                          <td className="py-3 px-3 font-mono text-[11px] text-[#777777] align-top pt-3.5">
                            <span className="px-1.5 py-0.5 bg-[#FAF9F5] border border-[#E5E4DE]">
                              {crit.format}
                            </span>
                          </td>

                          {/* Status column */}
                          <td className="py-3 px-3 text-center align-top pt-3.5">
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EBF7EE] text-[#16845B] border border-[#C2E7CB]">
                                <Check size={11} /> Approved
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FDEDED] text-[#D93D3D] border border-[#F8C8C8]">
                                <X size={11} /> Rejected
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FFF9E6] text-[#B76E00] border border-[#FFE699]">
                                <Clock size={11} /> Pending
                              </span>
                            )}
                          </td>

                          {/* Individual Actions column */}
                          <td className="py-3 px-4 text-right align-top pt-3" onClick={(e) => e.stopPropagation()}>
                            {editingCritId !== crit.id && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleSetCriterionStatus(crit, 'approved')}
                                  className={`px-2 py-1 text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 border transition-colors ${
                                    isApproved
                                      ? 'bg-[#16845B] text-white border-[#16845B]'
                                      : 'bg-white text-[#16845B] border-[#C2E7CB] hover:bg-[#EBF7EE]'
                                  }`}
                                  title="Approve criterion"
                                >
                                  <Check size={11} /> {isApproved ? 'Approved' : 'Approve'}
                                </button>

                                <button
                                  onClick={() => handleSetCriterionStatus(crit, 'rejected')}
                                  className={`px-2 py-1 text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 border transition-colors ${
                                    isRejected
                                      ? 'bg-[#D93D3D] text-white border-[#D93D3D]'
                                      : 'bg-white text-[#D93D3D] border-[#F8C8C8] hover:bg-[#FDEDED]'
                                  }`}
                                  title="Reject criterion"
                                >
                                  <X size={11} /> {isRejected ? 'Rejected' : 'Reject'}
                                </button>

                                <button
                                  onClick={() => handleStartEditCriterion(crit)}
                                  className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 border border-[#D7D6D0] bg-white text-[#555555] hover:border-[#171717] hover:text-[#171717] transition-colors"
                                  title="Edit criterion wording"
                                >
                                  <Edit3 size={11} /> Edit
                                </button>

                                <button
                                  onClick={() => handleRegenerateCriterion(crit)}
                                  disabled={regeneratingCritId === crit.id}
                                  className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 border border-[#D0DDFF] bg-[#F0F4FF] text-[#365CFF] hover:bg-[#E0EBFF] transition-colors disabled:opacity-50"
                                  title="AI regenerate"
                                >
                                  <RefreshCw size={11} className={regeneratingCritId === crit.id ? 'animate-spin' : ''} />
                                  {regeneratingCritId === crit.id ? '...' : 'Regen'}
                                </button>

                                <button
                                  onClick={() => handleDeleteCriterion(crit.id)}
                                  className="p-1 text-[#999999] hover:text-[#D93D3D] transition-colors"
                                  title="Delete criterion"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#777777] border border-dashed border-[#D7D6D0] bg-[#FAF9F5] space-y-3">
              <div>
                No acceptance criteria generated yet for <strong className="text-[#171717]">{selectedReq?.req_id || 'this requirement'}</strong>.
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleTriggerAnalysis}
                  disabled={analyzing || !selectedReq}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-[#365CFF] hover:bg-[#254ADB] text-white flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Sparkles size={13} className={analyzing ? 'animate-spin' : ''} />
                  {analyzing ? 'Formulating...' : 'Generate Criteria with AI'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCritModal(true)}
                  className="px-3.5 py-2 text-xs font-mono font-semibold bg-white hover:bg-[#F5F4EF] text-[#171717] border border-[#D7D6D0] flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={13} /> Add Custom Criterion
                </button>
              </div>
            </div>
          )}

          {/* Bottom Summary Bar with Direct Test Conversion Button */}
          <div className="mt-5 pt-4 border-t border-[#F0F0EE] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs font-mono text-[#777777]">
              {selectedReq?.acceptance_criteria ? (
                <span>
                  Selection status: <strong>{selectedCritIds.length}</strong> selected &bull; <strong>{selectedReq.acceptance_criteria.filter(c => c.review_status === 'approved' || (c.review_status !== 'rejected' && c.is_approved)).length}</strong> approved out of {selectedReq.acceptance_criteria.length} criteria
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleConvertSelectedToTests}
                disabled={selectedCritIds.length === 0 || convertingToTests}
                className="bg-[#171717] hover:bg-[#262626] text-white px-5 py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <FlaskConical size={14} className={convertingToTests ? 'animate-spin text-[#C8F169]' : 'text-[#C8F169]'} />
                {convertingToTests ? 'Converting to Tests...' : 'Convert Selected to Test Cases'}
                <ArrowRight size={14} className="text-[#C8F169]" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal: Add Custom Criterion */}
        {showAddCritModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#171717] w-full max-w-lg shadow-2xl p-6">
              <div className="flex items-center justify-between border-b border-[#D7D6D0] pb-3 mb-4">
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wide font-sans">
                  Add Acceptance Criterion
                </h3>
                <button
                  onClick={() => setShowAddCritModal(false)}
                  className="text-[#777777] hover:text-[#171717]"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAddCustomCriterion} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#555555] uppercase mb-1">
                    Criterion Specification (Given / When / Then)
                  </label>
                  <textarea
                    value={newCritText}
                    onChange={(e) => setNewCritText(e.target.value)}
                    required
                    rows={4}
                    placeholder="Given an authenticated user, When invalid payload is submitted, Then HTTP 400 with validation details is returned."
                    className="w-full text-xs font-mono p-3 border border-[#D7D6D0] bg-[#FAF9F5] focus:outline-none focus:ring-1 focus:ring-[#171717] resize-none"
                  />
                  <p className="text-[11px] font-sans text-[#777777] mt-1">
                    New criteria will initially be in &ldquo;Pending Review&rdquo; status so you can inspect and approve before test synthesis.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0F0EE]">
                  <button
                    type="button"
                    onClick={() => setShowAddCritModal(false)}
                    className="px-3 py-1.5 text-xs font-mono border border-[#D7D6D0] bg-white hover:bg-[#F5F4EF] text-[#666666]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingAction || !newCritText.trim()}
                    className="px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-[#171717] text-white hover:bg-[#262626] disabled:opacity-50"
                  >
                    {savingAction ? 'Adding...' : 'Add Criterion'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Editorial Quote Card: "Ambiguity is the silent killer of quality." */}
        <div className="bg-[#171717] text-white border border-[#262626] p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="text-3xl text-[#C8F169] font-mono font-bold">
            01 / SPEC
          </div>

          <blockquote className="my-auto py-6 text-2xl font-black tracking-tight leading-snug">
            &ldquo;Ambiguity is the silent killer of quality.&rdquo;
          </blockquote>

          <div className="pt-4 border-t border-[#333333] text-xs font-mono text-neutral-400">
            SPEC2TEST VERIFICATION RULE &bull; UNTESTED SPECS ARE NOT REQUIREMENTS
          </div>
        </div>
      </div>
    </div>
  );
};
