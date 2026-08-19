/* Traqi — logo mark and wordmark, shared by every surface */

export const Mark = ({ dark = true, size = 32 }: { dark?: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="5" y="6.5" width="22" height="5" rx="2.5" fill={dark ? '#818CF8' : '#4F46E5'} />
    <rect x="5" y="13.5" width="15" height="5" rx="2.5" fill={dark ? '#6366F1' : '#818CF8'} />
    <rect x="5" y="20.5" width="9" height="5" rx="2.5" fill="#F59E0B" />
  </svg>
);

export const Wordmark = ({ className = '' }: { className?: string }) => (
  <span className={'wordmark ' + className}>Traq<span className="ti">ı</span></span>
);
