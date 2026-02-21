import React from 'react';

function SpriteIcon({ className = '', id }) {
  const iconHref = `/icon-sprite.svg#${id}`;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <use href={iconHref} xlinkHref={iconHref} />
    </svg>
  );
}

export const LockVaultIcon = ({ className = '' }) => <SpriteIcon className={className} id="lock-vault" />;
export const CoinStackIcon = ({ className = '' }) => <SpriteIcon className={className} id="coin-stack" />;
export const TrendUpIcon = ({ className = '' }) => <SpriteIcon className={className} id="trend-up" />;
export const ShieldCheckIcon = ({ className = '' }) => <SpriteIcon className={className} id="shield-check" />;
export const EpochClockIcon = ({ className = '' }) => <SpriteIcon className={className} id="epoch-clock" />;
export const WalletDepositIcon = ({ className = '' }) => <SpriteIcon className={className} id="wallet-deposit" />;
export const SplitRouteIcon = ({ className = '' }) => <SpriteIcon className={className} id="split-route" />;
export const SignalRateIcon = ({ className = '' }) => <SpriteIcon className={className} id="signal-rate" />;
export const RedeemCycleIcon = ({ className = '' }) => <SpriteIcon className={className} id="redeem-cycle" />;
export const ArrowRightIcon = ({ className = '' }) => <SpriteIcon className={className} id="arrow-right" />;
export const LoopIcon = ({ className = '' }) => <SpriteIcon className={className} id="loop" />;

export const WalletConnectIcon = ({ className = '' }) => <SpriteIcon className={className} id="wallet-connect" />;
export const PaperDocIcon = ({ className = '' }) => <SpriteIcon className={className} id="paper-doc" />;
export const DepositActionIcon = ({ className = '' }) => <SpriteIcon className={className} id="deposit-action" />;
export const RedeemActionIcon = ({ className = '' }) => <SpriteIcon className={className} id="redeem-action" />;
export const NetworkChainIcon = ({ className = '' }) => <SpriteIcon className={className} id="network-chain" />;
export const BtcCoreIcon = ({ className = '' }) => <SpriteIcon className={className} id="btc-core" />;
export const CashReserveIcon = ({ className = '' }) => <SpriteIcon className={className} id="cash-reserve" />;
export const PriceFeedIcon = ({ className = '' }) => <SpriteIcon className={className} id="price-feed" />;
export const SparkIcon = ({ className = '' }) => <SpriteIcon className={className} id="spark" />;
export const CodeBracketsIcon = ({ className = '' }) => <SpriteIcon className={className} id="code-brackets" />;
