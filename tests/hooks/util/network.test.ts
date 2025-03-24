import { describe, it, expect, vi } from 'vitest';
import {
  getNetworkName,
  logConnectionInfo,
} from '../../../src/hooks/util/network';

describe('getNetworkName', () => {
  it('should return Devnet for devnet endpoints', () => {
    expect(getNetworkName('https://api.devnet.solana.com')).toBe('Devnet');
    expect(getNetworkName('http://localhost:8899?devnet')).toBe('Devnet');
  });

  it('should return Testnet for testnet endpoints', () => {
    expect(getNetworkName('https://api.testnet.solana.com')).toBe('Testnet');
    expect(getNetworkName('http://testnet.solana.com:8899')).toBe('Testnet');
  });

  it('should return Mainnet Beta for mainnet endpoints', () => {
    expect(getNetworkName('https://api.mainnet-beta.solana.com')).toBe(
      'Mainnet Beta'
    );
    expect(getNetworkName('https://solana-api.projectserum.com')).toBe(
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

describe('logConnectionInfo', () => {
  it('should log connection info and return true on success', async () => {
    // モックの作成
    const mockConnection = {
      rpcEndpoint: 'https://api.devnet.solana.com',
      getBlockHeight: vi.fn().mockResolvedValue(12345),
    };

    // コンソールをモック
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await logConnectionInfo(mockConnection as any);

    expect(result).toBe(true);
    expect(consoleSpy).toHaveBeenCalledTimes(3);
    expect(mockConnection.getBlockHeight).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should return false on connection error', async () => {
    // 失敗するモックの作成
    const mockConnection = {
      rpcEndpoint: 'https://api.devnet.solana.com',
      getBlockHeight: vi.fn().mockRejectedValue(new Error('Connection failed')),
    };

    // コンソールエラーをモック
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const result = await logConnectionInfo(mockConnection as any);

    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
