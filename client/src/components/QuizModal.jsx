import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Award, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  GitBranch,
  X,
  HelpCircle,
  FileCode2,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QuizModal({ 
  isOpen, 
  onClose, 
  quizData, 
  assignmentTitle,
  assignmentSubject,
  onSubmitQuiz, 
  isSubmitting, 
  result,
  onResetQuiz,
  onProceedToGithub
}) {
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes for 10 questions
  const displayTitle = assignmentTitle || quizData?.assignmentTitle || 'Assignment Viva';
  const displaySubject = assignmentSubject || quizData?.assignmentSubject || '';

  useEffect(() => {
    if (!isOpen || result) return;
    if (timeLeft <= 0) {
      // Auto-submit when time runs out
      onSubmitQuiz(selectedAnswers);
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, timeLeft, result, selectedAnswers, onSubmitQuiz]);

  useEffect(() => {
    if (isOpen && quizData) {
      setSelectedAnswers({});
      setTimeLeft(600);
    }
  }, [isOpen, quizData]);

  // Trigger celebration confetti if passed
  useEffect(() => {
    if (result?.passed) {
      try {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [result]);

  if (!isOpen || !quizData) return null;

  const questions = quizData.questions || [];
  const totalCount = questions.length || 10;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = answeredCount === totalCount;
  const progressPercent = Math.round((answeredCount / totalCount) * 100);

  const handleSelect = (qIndex, optionIndex) => {
    if (result) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIndex]: optionIndex
    }));
  };

  const handleSubmit = () => {
    onSubmitQuiz(selectedAnswers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  AI Code Comprehension Viva (10 Questions)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                  Pass: ≥ {quizData.passingThreshold || 70}% (7/10)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs">
                  <FileCode2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Assignment: <strong>{displayTitle}</strong></span>
                </span>
                {displaySubject && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    • {displaySubject}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!result && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Jump Bar */}
        {!result && (
          <div className="px-6 py-3 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
              <span className="font-semibold">Questions Completed</span>
              <span className="font-bold text-indigo-600">{answeredCount} of {totalCount} ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="p-6 space-y-6 overflow-y-auto grow">
          
          {/* Result Alert Banner */}
          {result && (
            <div className={`p-5 rounded-2xl border ${
              result.passed 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : 'bg-red-50 border-red-200 text-red-950'
            }`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${
                    result.passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {result.passed ? <Award className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                        <FileCode2 className="w-3 h-3 text-indigo-500" />
                        <span>Assignment: <strong>{displayTitle}</strong></span>
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold">
                      {result.passed ? '🎉 Viva Understanding Verified!' : '⚠️ Minimum Passing Score Not Met'}
                    </h4>
                    <p className="text-xs mt-0.5 opacity-90">
                      Score: <span className="font-extrabold">{result.score}%</span> ({result.correctCount} of {result.totalQuestions} questions correct) — Passing mark required: <span className="font-bold">{result.minRequiredScore}% (7/10)</span>
                    </p>
                  </div>
                </div>

                {result.passed ? (
                  <button
                    onClick={onProceedToGithub}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-200 transition shrink-0"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Final Submit Assignment</span>
                  </button>
                ) : (
                  <button
                    onClick={onResetQuiz}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-700 text-xs font-bold hover:bg-red-50 transition shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Quiz Again</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 10 Questions Array */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => {
              const reviewItem = result?.breakdown?.[qIndex];

              return (
                <div 
                  key={q.id || qIndex} 
                  className={`p-5 rounded-2xl border transition-all ${
                    reviewItem 
                      ? reviewItem.isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-red-50/40 border-red-200'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start space-x-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        {qIndex + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                        {q.question}
                      </h4>
                    </div>
                    {reviewItem && (
                      <span className="shrink-0">
                        {reviewItem.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Options */}
                  <div className="space-y-2 mt-3 pl-8">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[qIndex] === optIdx;
                      let optionStyle = 'border-slate-200 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-slate-700';

                      if (reviewItem) {
                        if (optIdx === reviewItem.correctIndex) {
                          optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                        } else if (isSelected && !reviewItem.isCorrect) {
                          optionStyle = 'border-red-400 bg-red-50 text-red-800 line-through';
                        } else {
                          optionStyle = 'border-slate-200 opacity-40';
                        }
                      } else if (isSelected) {
                        optionStyle = 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-xs';
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelect(qIndex, optIdx)}
                          disabled={Boolean(result)}
                          className={`w-full text-left p-3 rounded-xl border text-xs flex items-center space-x-3 transition ${optionStyle}`}
                        >
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-600 text-white' 
                              : 'border-slate-300 text-slate-500'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="grow">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after submission */}
                  {reviewItem && (
                    <div className="mt-3 pl-8 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-800">Explanation: </span>
                      {reviewItem.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {!result ? (
              <span>Answered <strong className="text-slate-800">{answeredCount}</strong> of {totalCount} questions</span>
            ) : (
              <span>Review completed</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {!result ? (
              <button
                onClick={handleSubmit}
                disabled={!isAllAnswered || isSubmitting}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? 'Grading Viva...' : `Submit All ${totalCount} Answers`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 transition"
              >
                Close Window
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
