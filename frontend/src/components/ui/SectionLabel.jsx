export default function SectionLabel({ children, subtle = false }) {
  return <p className={subtle ? 'eyebrow-subtle' : 'eyebrow'}>{children}</p>;
}
