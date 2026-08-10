export default function Card({
  children,
  className = '',
  hover = false,
  pad = true,
  onClick,
  interactive = false,
  ...props
}) {
  const classes = [
    'card',
    pad ? 'card-pad' : '',
    hover || interactive ? 'card-hover' : '',
    (interactive || onClick) ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
}
