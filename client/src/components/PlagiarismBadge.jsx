import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle, ArrowRight, Sparkles, Eye } from 'lucide-react';

export default function PlagiarismBadge({ tier1Result, onTriggerTier2, isRunningTier2 }) {
  if (!tier1Result) return null;

  const score = tier1Result.score;
  const isClean = tier1Result.status === 'CLEAN';
  const isBorderline = tier1Result.status === 'BORDERLINE';
  const isHigh = tier1Result.status === 'HIGH_SIMILARITY';

  return (
    <div className={`rounded-2xl p-5 border transition-all ${
      isClean 
        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
        : isBorderline
        ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
        : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
    }`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left Score Meter & Verdict */}
        <div className="flex items-center space-x-4">
          <div className="relative flex items-center justify-center">
            {/* Score Ring */}
            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-xl border-2 ${
              isClean 
                ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-400' 
                : isBorderline 
                ? 'border-amber-500/50 bg-amber-950/60 text-amber-400' 
                : 'border-rose-500/50 bg-rose-950/60 text-rose-400'
            }`}>
              <span>{score}%</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">Match</span>
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-900">
                Tier-1 Winnowing Engine
              </span>
              <span className="font-bold text-base text-slate-100">
                {tier1Result.verdict}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              {isClean && 'Code fingerprints exhibit high originality against peer repository submissions. You can proceed directly to the AI understanding quiz.'}
              {isBorderline && 'Algorithmic structure shares partial overlap with past cohort submissions. Automatic Tier-2 Gemini AI Semantic Scan is required.'}
              {isHigh && 'High lexical and structural token duplication identified against submitted repository solutions.'}
            </p>

            {tier1Result.mostSimilarSubmission && (
              <div className="mt-2 text-xs text-slate-400 flex items-center space-x-2">
                <span>Closest match:</span>
                <span className="text-slate-200 font-medium">
                  {tier1Result.mostSimilarSubmission.studentName} ({tier1Result.mostSimilarSubmission.rollNo})
                </span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {tier1Result.mostSimilarSubmission.similarity}% overlap
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Call-to-action */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {isBorderline && (
            <button
              onClick={onTriggerTier2}
              disabled={isRunningTier2}
              className="w-full md:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-semibold text-xs hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isRunningTier2 ? 'Analyzing with Gemini AI...' : 'Trigger Tier-2 Deep AI Scan'}</span>
            </button>
          )}

          {isClean && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/40">
              <ShieldCheck className="w-4 h-4" />
              <span>Tier-1 Cleared</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
