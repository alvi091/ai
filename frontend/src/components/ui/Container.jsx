export default function Container({ children, className = '' }) {
  return (
    <div className={`mx-auto w-full max-w-app px-5 sm:px-8 lg:px-12 ${className}`}>
      {children}
    </div>
  );
}
