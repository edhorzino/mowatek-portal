export function BrandLogo({ size = 48, showWordmark = false, className = '' }) {
  return (
    <div className={`brand-logo ${className}`.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.22) }}>
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Mowatek">
        <defs>
          <linearGradient id="mowatek-logo-face" x1="8" y1="6" x2="55" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFE875" /><stop offset="0.45" stopColor="#F6C914" /><stop offset="1" stopColor="#B77905" />
          </linearGradient>
          <linearGradient id="mowatek-logo-edge" x1="12" y1="48" x2="51" y2="58" gradientUnits="userSpaceOnUse">
            <stop stopColor="#A16207" /><stop offset="1" stopColor="#78350F" />
          </linearGradient>
          <filter id="mowatek-logo-shadow" x="-30%" y="-30%" width="170%" height="180%">
            <feDropShadow dx="0" dy="5" stdDeviation="3" floodColor="#020617" floodOpacity="0.65" />
          </filter>
        </defs>
        <g filter="url(#mowatek-logo-shadow)">
          <path d="M10 15 16 9h39l-6 7H10Z" fill="#FFF4AD" />
          <path d="M49 16h6v35l-6 6V16Z" fill="url(#mowatek-logo-edge)" />
          <path d="M10 51h39l6-6v6L49 57H16l-6-6Z" fill="url(#mowatek-logo-edge)" />
          <rect x="10" y="16" width="39" height="35" rx="4" fill="url(#mowatek-logo-face)" stroke="#FFF0A0" strokeWidth="1.2" />
          <path d="M19 42V25h5.2l7.1 9.8 7.1-9.8h5.2v17h-4.6V31.7l-6.3 8.5h-2.9l-6.2-8.5V42H19Z" fill="#422006" />
          <path d="M19.8 26h4.1l7.4 10.1 7.3-10.1h4.1" fill="none" stroke="#6B3405" strokeWidth="1" opacity="0.45" />
        </g>
      </svg>
      {showWordmark && <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}><strong style={{ color: '#fff', fontSize: Math.round(size * 0.42), letterSpacing: '0.12em' }}>MOWATEK</strong><small style={{ color: 'var(--accent-cyan)', fontSize: Math.max(9, Math.round(size * 0.18)), letterSpacing: '0.16em', marginTop: 4 }}>OPERATIONS</small></span>}
    </div>
  )
}
