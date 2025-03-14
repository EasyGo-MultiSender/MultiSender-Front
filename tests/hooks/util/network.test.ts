import { describe, it, expect } from 'vitest';
import { getNetworkName } from '@/hooks/util/network';

describe('getNetworkName', () => {
  it('returns Devnet for devnet endpoint', () => {
    expect(getNetworkName('https://api.devnet.solana.com')).toBe('Devnet');
  });

  it('returns Testnet for testnet endpoint', () => {
    expect(getNetworkName('https://api.testnet.solana.com')).toBe('Testnet');
  });

  it('returns Mainnet Beta for mainnet endpoint', () => {
    expect(getNetworkName('https://api.mainnet-beta.solana.com')).toBe(
      'Mainnet Beta'
    );
  });

  it('returns Mainnet Beta for unknown endpoint', () => {
    expect(getNetworkName('https://api.unknown.solana.com')).toBe(
      'Mainnet Beta'
    );
  });

  it('returns Mainnet Beta for empty endpoint', () => {
    expect(getNetworkName('')).toBe('Mainnet Beta');
  });
});
