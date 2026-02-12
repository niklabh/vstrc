// vSTRC Vault ABI (essential functions)
export const vSTRC_ABI = [
  // ERC-4626
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function previewDeposit(uint256 assets) view returns (uint256)",
  "function previewRedeem(uint256 shares) view returns (uint256)",
  "function asset() view returns (address)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",

  // vSTRC specific
  "function currentRateBps() view returns (uint256)",
  "function targetPrice() view returns (uint256)",
  "function epochCount() view returns (uint256)",
  "function epochDuration() view returns (uint256)",
  "function lastEpochTimestamp() view returns (uint256)",
  "function totalDividendsPaid() view returns (uint256)",
  "function collateralRatio() view returns (uint256)",
  "function projectedAnnualDividend() view returns (uint256)",
  "function baseRateBps() view returns (uint256)",
  "function sensitivityBps() view returns (uint256)",
  "function minRateBps() view returns (uint256)",
  "function maxRateBps() view returns (uint256)",
  "function mintingPaused() view returns (bool)",
  "function redeemingPaused() view returns (bool)",

  // Events
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)",
  "event YieldRebalanced(uint256 newRate, uint256 marketPrice, uint256 targetPrice)",
  "event DividendDistributed(uint256 epoch, uint256 amount, uint256 rateBps)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const STRATEGY_ABI = [
  "function totalValue() view returns (uint256)",
  "function btcTreasuryValue() view returns (uint256)",
  "function cashReserveValue() view returns (uint256)",
  "function totalWbtcHeld() view returns (uint256)",
  "function circuitBreakerTripped() view returns (bool)",
];
