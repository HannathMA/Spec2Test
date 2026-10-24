import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ListChecks,
  FlaskConical,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpRight,
  Play,
  Network,
  Sparkles,
  Plus
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MetricCard } from '../../components/common/MetricCard';
import { Project, ProjectStats } from '../../types';
import { formatTimeAgo } from '../../lib/utils';

interface OverviewPageProps {
  stats: ProjectStats | null;
  activeProject: Project | null;
  loading: boolean;
  onRefresh: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  stats,
  activeProject,
  loading,
  onRefresh
}) => {
  const navigate = useNavigate();

  const metrics = stats?.metrics || {
    total_requirements: 12,
    acceptance_criteria: 28,
    generated_tests: 64,
    passed_tests: 52,
    failed_tests: 7,
    unverified_tests: 5,
    verified_requirements: 9,
    failed_requirements: 2,
    unverified_requirements: 1,
    verification_rate: 81.0
  };

  // Donut chart data
  const healthData = [
    { name: 'Passed', value: metrics.passed_tests || 52, color: '#16845B' },
    { name: 'Failed', value: metrics.failed_tests || 7, color: '#D93D3D' },
    { name: 'Unverified', value: metrics.unverified_tests || 5, color: '#777777' },
  ];

  const verificationRate = metrics.verification_rate || 81;

  return (
    <div className="space-y-6">
      {/* Hero Greeting & Editorial Brand Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 bg-white border border-[#D7D6D0] p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#777777] mb-1">
              Software Verification Workbench
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#171717] tracking-tight font-sans">
              Good morning, Hanna.
            </h1>
            <p className="text-base text-[#555555] mt-1 font-sans">
              From requirements to verified software.
            </p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-[#F0F0EE]">
            <button
              onClick={() => navigate('/requirements')}
              className="bg-[#171717] hover:bg-[#262626] text-white px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} className="text-[#C8F169]" /> Add Requirements
            </button>
            <button
              onClick={() => navigate('/test-lab')}
              className="bg-white hover:bg-[#F5F4EF] text-[#171717] border border-[#D7D6D0] px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FlaskConical size={14} className="text-[#365CFF]" /> Generate Tests
            </button>
            <button
              onClick={() => navigate('/execution')}
              className="bg-white hover:bg-[#F5F4EF] text-[#171717] border border-[#D7D6D0] px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Play size={14} className="text-[#16845B]" /> Run Tests
            </button>
            <button
              onClick={() => navigate('/traceability')}
              className="bg-white hover:bg-[#F5F4EF] text-[#171717] border border-[#D7D6D0] px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Network size={14} className="text-[#777777]" /> View Traceability
            </button>
          </div>
        </div>

        {/* Editorial Brand Panel */}
        <div className="bg-[#171717] text-white p-6 sm:p-7 flex flex-col justify-between border border-[#262626] relative overflow-hidden">
          {/* Subtle geometric graphic motif */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
            <svg viewBox="0 0 100 100" fill="currentColor">
              <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-[#C8F169]" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                Editorial Baseline
              </span>
            </div>
            <div className="text-xl font-black tracking-tight leading-snug">
              BETTER.<br />
              TESTS.<br />
              REAL.<br />
              CONFIDENCE.
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#333333] flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>SPEC2TEST ARCHITECTURE</span>
            <span className="text-[#C8F169]">100% EXECUTABLE</span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Row (Matching Screenshot) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Total Requirements"
          value={metrics.total_requirements}
          trend="+8%"
          trendDirection="up"
          icon={<FileText size={14} className="text-[#365CFF]" />}
          iconBg="bg-[#EEF2FF]"
        />
        <MetricCard
          label="Acceptance Criteria"
          value={metrics.acceptance_criteria}
          trend="+12%"
          trendDirection="up"
          icon={<ListChecks size={14} className="text-[#365CFF]" />}
          iconBg="bg-[#EEF2FF]"
        />
        <MetricCard
          label="Generated Tests"
          value={metrics.generated_tests}
          trend="+20%"
          trendDirection="up"
          icon={<FlaskConical size={14} className="text-[#8B5CF6]" />}
          iconBg="bg-[#F5F3FF]"
        />
        <MetricCard
          label="Passed"
          value={metrics.passed_tests}
          trend={`${Math.round((metrics.passed_tests / Math.max(1, metrics.generated_tests)) * 100)}%`}
          trendDirection="up"
          icon={<CheckCircle2 size={14} className="text-[#16845B]" />}
          iconBg="bg-[#EBF7EE]"
        />
        <MetricCard
          label="Failed"
          value={metrics.failed_tests}
          trend={`${Math.round((metrics.failed_tests / Math.max(1, metrics.generated_tests)) * 100)}%`}
          trendDirection="down"
          icon={<XCircle size={14} className="text-[#D93D3D]" />}
          iconBg="bg-[#FDEDED]"
        />
        <MetricCard
          label="Unverified"
          value={metrics.unverified_tests}
          trend={`${Math.round((metrics.unverified_tests / Math.max(1, metrics.generated_tests)) * 100)}%`}
          trendDirection="neutral"
          icon={<HelpCircle size={14} className="text-[#777777]" />}
          iconBg="bg-[#F5F4EF]"
        />
      </div>

      {/* Bottom Row: Project Health Donut & Recent Activity & Quote Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Health Card with Recharts Donut */}
        <div className="bg-white border border-[#D7D6D0] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#171717] uppercase tracking-wide">
                Project Health
              </h2>
              <p className="text-xs text-[#777777] mt-0.5">
                Requirement verification coverage
              </p>
            </div>
            <button
              onClick={() => navigate('/traceability')}
              className="text-[#365CFF] hover:underline text-xs font-semibold flex items-center gap-0.5"
            >
              Matrix <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="flex items-center justify-center my-2">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={68}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {healthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-[#171717] font-sans">
                  {verificationRate}%
                </span>
                <span className="text-[10px] uppercase font-mono text-[#777777] text-center px-2">
                  Requirements Verified
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Legend */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#F0F0EE] text-center">
            <div className="p-1.5 bg-[#F5F4EF] border border-[#E5E4DE]">
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#16845B] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#16845B]" />
                Passed
              </div>
              <div className="text-base font-extrabold text-[#171717] mt-0.5 font-mono">
                {metrics.passed_tests}
              </div>
            </div>
            <div className="p-1.5 bg-[#F5F4EF] border border-[#E5E4DE]">
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#D93D3D] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#D93D3D]" />
                Failed
              </div>
              <div className="text-base font-extrabold text-[#171717] mt-0.5 font-mono">
                {metrics.failed_tests}
              </div>
            </div>
            <div className="p-1.5 bg-[#F5F4EF] border border-[#E5E4DE]">
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#777777] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#777777]" />
                Unverified
              </div>
              <div className="text-base font-extrabold text-[#171717] mt-0.5 font-mono">
                {metrics.unverified_tests}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="bg-white border border-[#D7D6D0] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#171717] uppercase tracking-wide">
                Recent Activity
              </h2>
              <span className="text-[11px] font-mono text-[#777777]">Live feed</span>
            </div>

            <div className="space-y-4">
              {(stats?.recent_activity || []).map((item) => (
                <div key={item.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#365CFF] mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#171717] truncate">
                      {item.title}
                    </div>
                    <div className="text-[#666666] text-[11px] truncate mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#888888] whitespace-nowrap">
                    {formatTimeAgo(item.created_at)}
                  </div>
                </div>
              ))}
              {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
                <div className="text-xs text-[#777777] py-8 text-center">
                  No activity recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0F0EE]">
            <button
              onClick={() => navigate('/execution')}
              className="w-full text-center py-2 text-xs font-semibold text-[#171717] hover:bg-[#F5F4EF] border border-[#D7D6D0] transition-colors"
            >
              View Full Execution Log
            </button>
          </div>
        </div>

        {/* Editorial Quote Card (Matching Screenshot) */}
        <div className="bg-white border border-[#D7D6D0] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
          <div className="text-4xl text-[#171717] font-serif font-bold">
            &ldquo;
          </div>
          <blockquote className="my-auto py-4 text-2xl font-black text-[#171717] tracking-tight leading-snug">
            Good software isn&apos;t just built.
            <br />
            <span className="text-[#365CFF]">It&apos;s verified.</span>
          </blockquote>

          {/* Brutalist geometric mark */}
          <div className="flex items-center justify-between pt-4 border-t border-[#D7D6D0]">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-[#171717]" />
              <div className="w-5 h-5 bg-[#D7D6D0]" />
              <div className="w-5 h-5 bg-[#C8F169]" />
            </div>
            <span className="font-mono text-[10px] text-[#777777] tracking-widest uppercase">
              SPEC2TEST ESSENTIALS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
