import React, { useState, useEffect } from 'react';
import { Settings, Key, Sliders, CheckCircle, Save, X, Sparkles, AlertCircle } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, currentSettings, onSaveSettings }) {
  const [apiKey, setApiKey] = useState('');
  const [lowThreshold, setLowThreshold] = useState(35);
  const [highThreshold, setHighThreshold] = useState(75);
  const [minQuizScore, setMinQuizScore] = useState(70);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setLowThreshold(currentSettings.tier1ThresholdLow || 35);
      setHighThreshold(currentSettings.tier1ThresholdHigh || 75);
      setMinQuizScore(currentSettings.defaultMinQuizScore || 70);
    }
  }, [currentSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      ...(apiKey ? { geminiApiKey: apiKey.trim() } : {}),
      tier1ThresholdLow: Number(lowThreshold),
      tier1ThresholdHigh: Number(highThreshold),
      defaultMinQuizScore: Number(minQuizScore)
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">System & AI Settings</h3>
              <p className="text-xs text-slate-400">Configure Gemini API Key & Validation Thresholds</p>
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
        <div className="p-6 space-y-5 text-xs">
          
          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                Google Gemini API Key
              </span>
              {currentSettings?.geminiApiKeyConfigured ? (
                <span className="text-[10px] text-emerald-400 font-mono">Configured ({currentSettings.geminiKeyPreview})</span>
              ) : (
                <span className="text-[10px] text-amber-400 font-mono">Offline Mode Active</span>
              )}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy... (leave blank to keep current or use offline simulator)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none transition"
            />
            <p className="text-[11px] text-slate-500">
              Optional: If left blank, the platform runs in an intelligent built-in semantic & dynamic quiz simulation mode.
            </p>
          </div>

          {/* Threshold Sliders */}
          <div className="pt-3 border-t border-slate-800 space-y-4">
            <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Two-Tier Detection Thresholds
            </h4>

            {/* Low Threshold */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Tier-1 Clean Threshold (Below this = Direct Pass)</span>
                <span className="text-emerald-400 font-bold">{lowThreshold}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={lowThreshold}
                onChange={(e) => setLowThreshold(e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* High Threshold */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Tier-1 Borderline Threshold (Above this = High Plagiarism)</span>
                <span className="text-rose-400 font-bold">{highThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                value={highThreshold}
                onChange={(e) => setHighThreshold(e.target.value)}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <span className="text-[10px] text-amber-400/80 block mt-1">
                Submissions between {lowThreshold}% and {highThreshold}% automatically trigger Tier-2 Gemini AI Semantic Check.
              </span>
            </div>

            {/* Min Quiz Score */}
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Minimum Quiz Pass Mark for GitHub Unlock</span>
                <span className="text-indigo-400 font-bold">{minQuizScore}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={minQuizScore}
                onChange={(e) => setMinQuizScore(e.target.value)}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition"
          >
            {isSaved ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span>Saved Settings!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
