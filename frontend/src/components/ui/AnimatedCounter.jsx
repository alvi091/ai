import { useCountUp } from '../../lib/hooks';

export default function AnimatedCounter({
  value = 0,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1200,
  className = '',
  format,
}) {
  const animated = useCountUp(value, { duration, decimals });

  let display = animated;
  if (typeof format === 'function') {
    display = format(animated);
  } else if (decimals > 0) {
    display = animated.toFixed(decimals);
  } else {
    display = Math.round(animated).toLocaleString('en-US');
  }

  return (
    <span className={`tnum ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
