import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Sparkles, Loader2 } from 'lucide-react';
import { fadeUpSm } from '../../lib/motion';

export default function AiSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Describe what you need…',
  examples = [],
  submitting = false,
  className = '',
  autoFocus = false,
  large = true,
  id = 'ai-search',
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, large ? 132 : 104)}px`;
  }, [value, large]);

  const submit = () => {
    const v = (value || '').trim();
    if (v && !submitting) onSubmit?.(v);
  };

  return (
    <motion.div variants={fadeUpSm} className={className}>
      <div
        className={`relative rounded-[28px] border border-surface-300 bg-surface-100 shadow-soft transition-all duration-300
           focus-within:shadow-glow ${
            large ? 'p-3 sm:p-4' : 'p-2.5'
          }`}
      >
        <div className="flex items-start gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary-600/12 border border-primary-600/25 shrink-0 mt-1">
            <Sparkles className="w-5 h-5 text-primary-400" />
          </span>

          <textarea
            ref={ref}
            id={id}
            rows={1}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className={`flex-1 resize-none bg-transparent text-white placeholder:text-surface-500 outline-none
              focus:shadow-none focus-visible:shadow-none focus-visible:outline-none
              text-[15px] leading-relaxed pt-3 ${large ? 'min-h-[52px]' : 'min-h-[44px]'}`}
            autoFocus={autoFocus}
            aria-label="AI search"
          />

          <button
            type="button"
            onClick={submit}
            disabled={!value?.trim() || submitting}
            aria-label="Run AI search"
            className={`mt-1 flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 transition-all duration-300
              ${
                value?.trim() && !submitting
                  ? 'bg-primary-700 text-white hover:bg-primary-hover active:bg-primary-pressed shadow-[0_8px_24px_-8px_rgba(15,118,110,0.7)]'
                  : 'bg-surface-200 text-surface-500 cursor-not-allowed'
              }`}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {examples?.length > 0 && !value?.trim() && (
        <div className="mt-6">
          <p className="text-[12px] text-surface-500 mb-2.5">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange?.(ex)}
                className="chip"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
