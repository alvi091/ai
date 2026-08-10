import { Link } from 'react-router-dom';
import logoHorizontal from '../../assets/webapp/logo-horizontal-ondark.svg';
import logoIcon from '../../assets/webapp/logo-icon-white.svg';

const imgStyle = (size) => ({ height: size, width: 'auto', display: 'block' });

export function LogoMark({ size = 36, className = '' }) {
  return <img src={logoIcon} alt="" aria-hidden="true" className={className} style={imgStyle(size)} />;
}

export default function Logo({ size = 34, to = '/', showWordmark = true, className = '', imgClass = '' }) {
  const inner = (
    <img
      src={showWordmark ? logoHorizontal : logoIcon}
      alt="Ayymus"
      className={imgClass}
      style={imgStyle(size)}
    />
  );

  if (!to) return <span className={`inline-flex items-center ${className}`}>{inner}</span>;

  return (
    <Link to={to} className={`inline-flex items-center focus-ring rounded-lg ${className}`} aria-label="Ayymus home">
      {inner}
    </Link>
  );
}
