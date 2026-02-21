import React from 'react';

export function LockVaultIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <rect x="5" y="10" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" />
      <path d="M12 16.2V17.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function CoinStackIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.8" stroke="currentColor" strokeWidth="1.9" />
      <path d="M5.5 6.5V10.2C5.5 11.75 8.41 13 12 13C15.59 13 18.5 11.75 18.5 10.2V6.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M5.5 10.2V13.9C5.5 15.45 8.41 16.7 12 16.7C15.59 16.7 18.5 15.45 18.5 13.9V10.2" stroke="currentColor" strokeWidth="1.9" />
      <path d="M5.5 13.9V17.5C5.5 19.05 8.41 20.3 12 20.3C15.59 20.3 18.5 19.05 18.5 17.5V13.9" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

export function TrendUpIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 16.5L9.2 11.3L12.5 14.6L19.8 7.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 7.3H19.8V11.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3L19 6V11.6C19 15.8 16.1 19.6 12 21C7.9 19.6 5 15.8 5 11.6V6L12 3Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M9 12.2L11.1 14.3L15.2 10.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EpochClockIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 7.7V12L15.2 14.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2.7V4.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4.7 12H3.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M20.8 12H19.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function WalletDepositIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="6.5" width="17" height="11" rx="2.4" stroke="currentColor" strokeWidth="1.9" />
      <path d="M14 12H20.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9 4.5L12 1.8L15 4.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2.1V9.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="16.8" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function SplitRouteIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="2.3" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="18" cy="7" r="2.3" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="18" cy="17" r="2.3" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8.3 11.2L15.7 7.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8.3 12.8L15.7 16.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function SignalRateIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17.5L8.5 13L11.5 16L17.8 9.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.4 9.7H17.8V13.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20.3H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function RedeemCycleIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.2 9A7 7 0 0 1 18.8 8.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M18.8 15A7 7 0 0 1 5.2 15.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M18.8 8.2V4.7H15.3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.2 15.8V19.3H8.7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8H12.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.8 4.4L12.4 8L8.8 11.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LoopIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.6 7A5.4 5.4 0 0 1 12.5 5.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12.5 9A5.4 5.4 0 0 1 2.8 10.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12.6 5.2V2.7H10.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.7 10.8V13.3H5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
