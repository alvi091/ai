import { motion } from 'framer-motion';

export default function Reveal({
  children,
  delay = 0,
  y = 24,
  once = true,
  className = '',
  as: Tag = motion.div,
}) {
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-70px' }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}
