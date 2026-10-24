import React, { useState, useEffect } from 'react';
import {
  Network,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  FileText,
  FlaskConical,
  X,
  Printer
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TraceabilityMatrixResponse, TraceabilityRow } from '../../types';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/common/StatusBadge';

interface TraceabilityPageProps {
  projectId: string;
  loading: boolean;
  onRefresh: () => void;
}

export const TraceabilityPage: React.FC<TraceabilityPageProps> = ({
  projectId,
  loading,
  onRefresh
}) => {
  const [matrix, setMatrix] = useState<TraceabilityMatrixResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRow, setSelectedRow] = useState<TraceabilityRow | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const fetchMatrix = async () => {
    try {
      const data = await api.getTraceabilityMatrix(projectId);
      setMatrix(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [projectId]);

  const rows = matrix?.rows || [];
  const filteredRows = rows.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.verification_state === statusFilter;
  });

  const verified = matrix?.verified_count || 0;
  const failed = matrix?.failed_count || 0;
  const unverified = matrix?.unverified_count || 0;
  const total = matrix?.total_requirements || 0;
  const rate = matrix?.verification_rate || 0;

  const chartData = [
    { name: 'Verified', value: verified, color: '#16845B' },
    { name: 'Failed', value: failed, color: '#D93D3D' },
    { name: 'Unverified', value: unverified, color: '#777777' },
  ];

  const handleExportCSV = () => {
    window.open(`/api/v1/traceability/export/csv?project_id=${projectId}`, '_blank');
  };

  const handleExportHTML = () => {
    window.open(`/api/v1/traceability/export/html?project_id=${projectId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D7D6D0] pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-[#171717] tracking-tight font-sans">
            Traceability
          </h1>
          <p className="text-sm text-[#555555] mt-1 font-sans">
            See how each requirement is verified.
          </p>
        </div>

        {/* Filter and Export buttons matching screenshot */}
        <div className="flex items-center gap-2 relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#D7D6D0] px-3 py-2 text-xs font-mono text-[#171717]"
          >
            <option value="all">Filter: All Verification States</option>
            <option value="Verified">Verified Only</option>
            <option value="Failed">Failed Only</option>
            <option value="Unverified">Unverified Only</option>
          </select>

          {/* Export Report dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="bg-[#171717] hover:bg-[#262626] text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              <Download size={13} className="text-[#C8F169]" /> Export Report
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-[#D7D6D0] shadow-lg z-50 text-xs py-1">
                <button
                  onClick={() => {
                    handleExportCSV();
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F5F4EF] flex items-center gap-2"
                >
                  <FileText size={14} className="text-[#365CFF]" /> Export as CSV
                </button>
                <button
                  onClick={() => {
                    handleExportHTML();
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F5F4EF] flex items-center gap-2"
                >
                  <Printer size={14} className="text-[#16845B]" /> Print / HTML Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Coverage Overview (Donut) on Left, Traceability Matrix Table on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Coverage Overview Card matching screenshot (1 Col) */}
        <div className="bg-white border border-[#D7D6D0] p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#777777] mb-2">
              Coverage Overview
            </h2>

            {/* Donut Chart */}
            <div className="relative w-44 h-44 mx-auto my-3 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={66}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-[#171717] font-sans">
                  {rate}%
                </span>
                <span className="text-[10px] uppercase font-mono text-[#777777] text-center px-1">
                  Requirements Covered
                </span>
              </div>
            </div>

            {/* Legend list matching screenshot */}
            <div className="space-y-2 mt-4 pt-4 border-t border-[#F0F0EE] text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#555555]">
                  <span className="w-2 h-2 rounded-full bg-[#16845B]" />
                  Verified
                </span>
                <span className="font-mono font-bold text-[#171717]">{verified}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#555555]">
                  <span className="w-2 h-2 rounded-full bg-[#D93D3D]" />
                  Failed
                </span>
                <span className="font-mono font-bold text-[#171717]">{failed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[#555555]">
                  <span className="w-2 h-2 rounded-full bg-[#777777]" />
                  Unverified
                </span>
                <span className="font-mono font-bold text-[#171717]">{unverified}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#F5F4EF] font-bold">
                <span className="text-[#171717]">Total Requirements</span>
                <span className="font-mono text-[#171717]">{total}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-[#F0F0EE] text-[11px] text-[#777777] font-mono leading-relaxed">
            Conservative Policy: A requirement is only Verified when all required criteria have passing execution evidence.
          </div>
        </div>

        {/* Traceability Table matching screenshot (3 Cols) */}
        <div className="lg:col-span-3 bg-white border border-[#D7D6D0]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D7D6D0] bg-[#FAF9F5] text-[#777777] font-mono uppercase text-[11px]">
                  <th className="py-3 px-4 font-semibold">Requirement</th>
                  <th className="py-3 px-4 font-semibold">Acceptance Criteria</th>
                  <th className="py-3 px-4 font-semibold">Test Cases</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EE]">
                {filteredRows.map((row) => (
                  <tr
                    key={row.requirement_id}
                    onClick={() => setSelectedRow(row)}
                    className="hover:bg-[#FBFBFA] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-[#171717]">{row.req_id}</div>
                      <div className="text-[11px] font-sans text-[#666666] truncate max-w-xs mt-0.5">
                        {row.title}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-semibold text-[#171717]">
                        {row.approved_criteria_count} approved
                      </span>
                      {row.has_missing_coverage && (
                        <div className="text-[10px] text-[#D93D3D] font-mono mt-0.5">
                          {row.missing_coverage_reason}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {row.linked_tests.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.linked_tests.map((t) => (
                            <span
                              key={t.test_id}
                              className={`px-1.5 py-0.5 border text-[10px] ${
                                t.latest_status === 'Passed'
                                  ? 'bg-[#EBF7EE] border-[#C2E7CB] text-[#16845B]'
                                  : t.latest_status === 'Failed'
                                  ? 'bg-[#FDEDED] border-[#F8C8C8] text-[#D93D3D]'
                                  : 'bg-[#F5F4EF] border-[#D7D6D0] text-[#777777]'
                              }`}
                            >
                              {t.test_id}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#999999]">No tests linked</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={row.verification_state} size="sm" />
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedRow(row)}
                        className="text-xs font-mono text-[#365CFF] hover:underline"
                      >
                        Logs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Lineage Modal: Requirement -> Criteria -> Tests -> Results -> Evidence */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#171717] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[#D7D6D0] flex items-center justify-between bg-[#F5F4EF]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#171717]">
                    {selectedRow.req_id} Lineage
                  </span>
                  <StatusBadge status={selectedRow.verification_state} size="sm" />
                </div>
                <div className="text-base font-extrabold text-[#171717] mt-1 font-sans">
                  {selectedRow.title}
                </div>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-1 text-[#777777] hover:text-[#171717]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
              {/* Linked Acceptance Criteria */}
              <div>
                <h4 className="font-mono text-[11px] font-bold text-[#777777] uppercase tracking-wider mb-2">
                  1. Acceptance Criteria ({selectedRow.linked_criteria.length})
                </h4>
                <div className="space-y-2">
                  {selectedRow.linked_criteria.map((c) => (
                    <div key={c.criterion_id} className="p-3 bg-[#FAF9F5] border border-[#E5E4DE] flex items-start gap-2">
                      <span className="font-mono font-bold text-[#171717]">{c.criterion_id}</span>
                      <span className="flex-1 text-[#333333] leading-relaxed">{c.criterion_text}</span>
                      <span className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 border ${
                        c.review_status === 'approved' || c.is_approved
                          ? 'bg-[#EBF7EE] text-[#16845B] border-[#C2E7CB]'
                          : c.review_status === 'rejected'
                          ? 'bg-[#FDEDED] text-[#D93D3D] border-[#F8C8C8]'
                          : 'bg-[#FFF9E6] text-[#B76E00] border-[#FFE699]'
                      }`}>
                        {c.review_status || (c.is_approved ? 'Approved' : 'Pending')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Test Cases & Outcomes */}
              <div>
                <h4 className="font-mono text-[11px] font-bold text-[#777777] uppercase tracking-wider mb-2">
                  2. Verification Tests & Outcomes ({selectedRow.linked_tests.length})
                </h4>
                <div className="space-y-2">
                  {selectedRow.linked_tests.map((t) => (
                    <div key={t.test_id} className="p-3 border border-[#D7D6D0] bg-white flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#171717]">{t.test_id}</span>
                          <span className="font-medium text-[#171717]">{t.title}</span>
                        </div>
                        <div className="font-mono text-[10px] text-[#777777] mt-0.5">
                          Type: {t.test_type} &bull; Priority: {t.priority} {t.is_stale && '• STALE'}
                        </div>
                      </div>
                      <StatusBadge status={t.latest_status} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#D7D6D0] flex justify-end bg-[#F5F4EF]">
              <button
                onClick={() => setSelectedRow(null)}
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
