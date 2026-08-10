import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquareText, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { decision as decisionApi } from '../../services/api';
import { springTap } from './motion';

export default function FollowUpQuestions({ productId, prompt, onAnswersChange }) {
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['followUp', prompt],
    queryFn: () => decisionApi.getFollowUp(prompt || 'a product').then((r) => r.data),
    staleTime: 60000,
  });

  const questions = data?.questions || [];

  const handleAnswer = (answer) => {
    const updated = { ...answers, [currentQ]: answer };
    setAnswers(updated);
    onAnswersChange?.(updated);
    if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
  };

  if (isLoading || questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <MessageSquareText className="w-4 h-4 text-accent-400" />
        <h3 className="font-display text-[15px] font-semibold text-ink-100">Quick questions</h3>
        <span className="ml-auto text-[11px] text-ink-400">
          {currentQ + 1} of {questions.length}
        </span>
      </div>

      <motion.div
        key={currentQ}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="space-y-3"
      >
        <p className="text-sm text-ink-200 font-medium">{questions[currentQ]}</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Your answer…"
            className="input flex-1 !h-11"
            data-q={currentQ}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                handleAnswer(e.target.value.trim());
                e.target.value = '';
              }
            }}
          />
          <button
            {...springTap}
            onClick={() => {
              const input = document.querySelector(`[data-q="${currentQ}"]`);
              if (input?.value?.trim()) {
                handleAnswer(input.value.trim());
                input.value = '';
              }
            }}
            className="btn-primary !w-11 !px-0 shrink-0"
            aria-label="Answer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {Object.keys(answers).length > 0 && (
        <div className="mt-4 pt-3 border-t border-line">
          <p className="text-[11px] text-ink-400">
            Your answers will improve the recommendation.
          </p>
        </div>
      )}
    </motion.div>
  );
}
