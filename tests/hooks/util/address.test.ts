import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { validateMintAddress } from '@/hooks/util/address'; // エイリアスがない場合は `../src/validateMintAddress`

// テスト用のミントアドレス
const VALID_MINT_ADDRESS = 'CKAd3fZnQMeSjsgdFs1JfKPWS9RDpqJAMf9MjKE7i9LS';

// `getAccountInfo` をモック化
const mockGetAccountInfo = vi.fn();

// `mockConnection` を作成
const mockConnection = {
  getAccountInfo: mockGetAccountInfo,
  rpcEndpoint: 'https://api.devnet.solana.com', // 任意のエンドポイント
} as unknown as Connection;

describe('validateMintAddress', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // 各テストごとにモックをリセット
  });

  it('should validate a correct mint address', async () => {
    // `getAccountInfo` がトークンプログラムのオーナーを返す
    mockGetAccountInfo.mockResolvedValue({
      owner: TOKEN_PROGRAM_ID,
    });

    await expect(
      validateMintAddress(VALID_MINT_ADDRESS, mockConnection)
    ).resolves.toBe(true);
    expect(mockGetAccountInfo).toHaveBeenCalledTimes(1);
    expect(mockGetAccountInfo).toHaveBeenCalledWith(
      new PublicKey(VALID_MINT_ADDRESS)
    );
  });

  it('should throw an error if mint address is not found', async () => {
    // `getAccountInfo` が `null` を返す場合
    mockGetAccountInfo.mockResolvedValue(null);

    await expect(
      validateMintAddress(VALID_MINT_ADDRESS, mockConnection)
    ).rejects.toThrow(/was not found on the current network/);

    expect(mockGetAccountInfo).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if mint address has an invalid owner', async () => {
    // `getAccountInfo` が異なるプログラムIDを持つ
    mockGetAccountInfo.mockResolvedValue({
      owner: new PublicKey('11111111111111111111111111111111'), // 無効なオーナー
    });

    await expect(
      validateMintAddress(VALID_MINT_ADDRESS, mockConnection)
    ).rejects.toThrow(/not a valid token mint on the current network/);

    expect(mockGetAccountInfo).toHaveBeenCalledTimes(1);
  });

  it('should validate a token from the Token 2022 program', async () => {
    // `getAccountInfo` が `TOKEN_2022_PROGRAM_ID` のオーナーを持つ
    mockGetAccountInfo.mockResolvedValue({
      owner: TOKEN_2022_PROGRAM_ID,
    });

    await expect(
      validateMintAddress(VALID_MINT_ADDRESS, mockConnection)
    ).resolves.toBe(true);
    expect(mockGetAccountInfo).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if an unexpected error occurs', async () => {
    // `getAccountInfo` が予期しないエラーをスロー
    mockGetAccountInfo.mockRejectedValue(new Error('Unexpected error'));

    await expect(
      validateMintAddress(VALID_MINT_ADDRESS, mockConnection)
    ).rejects.toThrow('Unexpected error');

    expect(mockGetAccountInfo).toHaveBeenCalledTimes(1);
  });
});
