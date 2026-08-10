import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Sparkles } from 'lucide-react';
import { springTap } from './motion';

export default function AISearch({
  value,
  onChange,
  onSubmit,
  placeholder = 'Describe what you need…',
  examples = [],
  size = 'lg',
  autoFocus = false,
  disabled = false,
  className = '',
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && onSubmit) onSubmit(value);
    }
  };

  const large = size === 'lg';

  return (
    <div className={`w-full ${className}`}>
      <motion.div
        animate={{ scale: focused ? 1.01 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={() => inputRef.current?.focus()}
        className={`group relative flex items-center gap-3 rounded-[1.4rem] border bg-surface-100 transition-all duration-300 ${
          focused
            ? 'border-accent-600 shadow-glow'
            : 'border-line hover:border-ink-400/60 shadow-soft'
        } ${large ? 'p-2.5' : 'p-1.5'}`}
      >
        <div
          className={`shrink-0 flex items-center justify-center rounded-2xl transition-colors duration-300 ${
            large ? 'w-12 h-12' : 'w-10 h-10'
          } ${focused ? 'bg-accent-600 text-white' : 'bg-surface-200 text-accent-400 border border-line'}`}
        >
          <Sparkles className={large ? 'w-5 h-5' : 'w-4 h-4'} />
        </div>

        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKey}
          rows={large ? 1 : 1}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          className={`flex-1 resize-none bg-transparent text-ink-100 placeholder:text-ink-400/70 focus:outline-none scrollbar-none ${
            large ? 'min-h-[3rem] py-2 text-base' : 'min-h-[2.5rem] py-1.5 text-sm'
          }`}
          style={{ maxHeight: 160 }}
        />

        {value.trim() ? (
          <motion.button
            {...springTap}
            onClick={() => onSubmit?.(value)}
            disabled={disabled}
            className="shrink-0 flex items-center justify-center rounded-2xl bg-accent-600 text-white hover:bg-accent-500 transition-colors disabled:opacity-40"
            aria-label="Get decision"
            style={large ? { width: 48, height: 48 } : { width: 40, height: 40 }}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        ) : (
          <span
            className={`shrink-0 w-[3px] rounded-full bg-accent-500 animate-caret-blink ${large ? 'h-6' : 'h-5'}`}
            aria-hidden="true"
          />
        )}
      </motion.div>

      {examples.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                onChange(ex);
                inputRef.current?.focus();
              }}
              className="chip transition-colors hover:border-accent-600/60 hover:text-ink-100"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
