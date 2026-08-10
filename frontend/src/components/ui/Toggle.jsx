import { motion } from 'framer-motion';

export default function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="group flex w-full items-start justify-between gap-6 text-left cursor-pointer disabled:opacity-50"
    >
      <span className="flex-1 min-w-0">
        {label && <span className="block text-[15px] font-medium text-surface-800">{label}</span>}
        {description && (
          <span className="block mt-0.5 text-[13px] text-surface-500 leading-relaxed">{description}</span>
        )}
      </span>
      <motion.span
        layout
        className={`relative inline-flex shrink-0 w-[52px] h-[30px] rounded-full transition-colors duration-300 ${
          checked ? 'bg-primary-600' : 'bg-surface-300'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`absolute top-[3px] w-6 h-6 rounded-full bg-white shadow-sm ${
            checked ? 'left-[25px]' : 'left-[3px]'
          }`}
        />
      </motion.span>
    </button>
  );
}
