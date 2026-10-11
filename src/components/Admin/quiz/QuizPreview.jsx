import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye } from 'lucide-react';
import QuizPlayer from '../../StudentPortal/quiz/QuizPlayer';
import QuizResults from '../../StudentPortal/quiz/QuizResults';
import { scoreAnswers, fromDraft } from '../../../quiz/quizModel';

/** Try the quiz exactly as students will see it. Nothing is saved. */
export default function QuizPreview({ quiz, draft, onClose }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const answerKey = fromDraft(draft).key;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const finish = async (final, timeTakenSec) => {
    const attempt = { attemptNumber: 1, answers: final, timeTakenSec, score: scoreAnswers(quiz.questions, final, answerKey.answers) };
    setResult(attempt);
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-cream-100 overflow-y-auto font-poppins" role="dialog" aria-modal="true" aria-label="Quiz preview">
      <div className="sticky top-0 z-10 bg-temple-900 text-cream-50">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium"><Eye className="w-4 h-4 text-gold-300" /> Student preview: nothing is saved</span>
          <div className="flex items-center gap-2">
            {result && (
              <button type="button" onClick={() => { setResult(null); setAnswers({}); }} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium cursor-pointer">
                Try again
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close preview" className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {result ? (
          <QuizResults quiz={quiz} attempts={[result]} counted={result} answerKey={answerKey} preview />
        ) : (
          <QuizPlayer quiz={quiz} answers={answers} onAnswersChange={setAnswers} onSubmit={finish} onExit={onClose} preview />
        )}
      </div>
    </div>,
    document.body
  );
}
