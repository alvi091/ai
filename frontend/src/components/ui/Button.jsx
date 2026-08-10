import { motion } from 'framer-motion';

const VARIANT_CLASSES = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZE_CLASSES = {
  lg: 'btn-lg',
  md: 'btn-md',
  sm: 'btn-sm',
};

export default function Button({
  variant = 'primary',
  size = 'lg',
  className = '',
  children,
  disabled,
  loading,
  as,
  ...props
}) {
  const classes = `${VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary} ${SIZE_CLASSES[size] || SIZE_CLASSES.lg} ${className}`;
  const content = loading ? (
    <span className="flex items-center gap-2">
      <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
      <span>{children}</span>
    </span>
  ) : children;

  const Tag = as || 'button';

  if (disabled || loading || Tag !== 'button') {
    return (
      <Tag className={classes} disabled={disabled || loading} {...props}>
        {content}
      </Tag>
    );
  }

  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </motion.button>
  );
}
