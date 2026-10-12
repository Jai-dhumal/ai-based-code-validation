import React from 'react';
import { 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  GitCompare, 
  Bot, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function Tier2Modal({ isOpen, onClose, report, onProceedToQuiz }) {
  if (!isOpen || !report) return null;

  const isApproved = report.recommendation === 'Approve for Quiz' || report.verdict === 'Original Implementation';
  const isBorderline = report.recommendation === 'Flag for Teacher Review';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                Tier-2 Deep Gemini AI Audit
                {report.isOfflineFallback ? (
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Smart Heuristics Engine
                  </span>
                ) : (
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Google Gemini 1.5 Pro/Flash
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Semantic Logic Equivalence, Renamed Tokens & AI Assistant Footprint Audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Metric 1: Logic Equivalence */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="flex items-center gap-1.5">
                  <GitCompare className="w-3.5 h-3.5 text-blue-400" />
                  Logic Equivalence
                </span>
              </div>
              <div className="text-lg font-bold text-slate-100">
                {report.logicEquivalence || 'Moderate'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Structural control flow
              </div>
            </div>

            {/* Metric 2: AI Code Footprint */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  AI Footprint
                </span>
                <span className="text-slate-300 font-mono text-xs">{report.aiConfidencePercentage}%</span>
              </div>
              <div className="text-lg font-bold text-slate-100">
                {report.aiGeneratedLikelihood || 'Low'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                ChatGPT / Copilot patterns
              </div>
            </div>

            {/* Metric 3: Semantic Similarity Score */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Semantic Score
                </span>
              </div>
              <div className="text-lg font-bold text-slate-100">
                {report.semanticSimilarityScore}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Deep contextual match
              </div>
            </div>

          </div>

          {/* Renamed Identifiers Detected */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Variable & Function Renaming Mapping
            </h4>
            <div className="flex flex-wrap gap-2">
              {report.renamedIdentifiers && report.renamedIdentifiers.length > 0 ? (
                report.renamedIdentifiers.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-amber-300"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">No variable obfuscation detected.</span>
              )}
            </div>
          </div>

          {/* Gemini AI Detailed Explanation */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              AI Evaluation Breakdown
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              {report.explanation && report.explanation.map((item, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Final Verdict Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            isApproved
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
              : isBorderline
              ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
              : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
          }`}>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
                Audit Recommendation
              </span>
              <div className="font-bold text-sm text-white">
                {report.verdict} — {report.recommendation}
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Review Code
          </button>
          
          <button
            onClick={onProceedToQuiz}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-500/20"
          >
            <span>Proceed to AI Quiz</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
