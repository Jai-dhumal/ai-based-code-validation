import React from 'react';
import { 
  CheckCircle2, 
  GitCommit, 
  GitBranch, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  Award,
  X 
} from 'lucide-react';

export default function SubmissionReceiptModal({ isOpen, onClose, receipt }) {
  if (!isOpen || !receipt) return null;

  const downloadCertificate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(receipt, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `JSPM-Certificate-${receipt.student.rollNo}-${receipt.assignment.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-emerald-800/40 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Certificate Glow Header */}
        <div className="p-6 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border-b border-slate-800 text-center relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20">
            <Award className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
            JSPM BSIOTR Wagholi, Pune • Dept of Computer Engineering
          </span>
          <h3 className="text-xl font-extrabold text-white mt-1">
            Assignment Submission Certified
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Validated through 2-Tier AI Plagiarism Audit and Comprehension Viva
          </p>
        </div>

        {/* Certificate Card Content */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Student & Assignment Metadata */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Student Name</span>
              <span className="font-semibold text-slate-200 text-sm">{receipt.student.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Roll Number</span>
              <span className="font-mono font-semibold text-indigo-300">{receipt.student.rollNo}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-900">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Assignment</span>
              <span className="font-medium text-slate-300">{receipt.assignment.title}</span>
            </div>
          </div>

          {/* Plagiarism & Quiz Audit Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Plagiarism Audit</span>
              <span className="font-bold text-emerald-400 text-base">{receipt.audit.tier1Score} Match</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">{receipt.audit.tier2Verdict}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">AI Viva Score</span>
              <span className="font-bold text-indigo-400 text-base">{receipt.audit.quizScore} Certified</span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Understanding Verified</span>
            </div>
          </div>

          {/* GitHub Commit Verification */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                GitHub Repository Push
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
                Verified Commit
              </span>
            </div>
            
            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-2 rounded-lg font-mono text-[11px] text-slate-300 border border-slate-800">
              <GitCommit className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-indigo-400">{receipt.github.commitSha}</span>
              <span className="text-slate-500 truncate">{receipt.github.commitMessage}</span>
            </div>

            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1">
              <span>Hash: {receipt.verificationHash}</span>
              <span>{new Date(receipt.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={downloadCertificate}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Certificate JSON</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition"
          >
            Done & Return to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
