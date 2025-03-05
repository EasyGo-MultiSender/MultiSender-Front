import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { getNetworkName } from './network';

// Mintアドレスの検証関数
export const validateMintAddress = async (
  mintAddress: string,
  connection: Connection
): Promise<boolean> => {
  try {
    const mintPubkey = new PublicKey(mintAddress);

    // アカウント情報の取得
    const mintAccountInfo = await connection.getAccountInfo(mintPubkey);

    if (!mintAccountInfo) {
      console.error(
        `Mint account not found on current network: ${mintAddress}`
      );
      throw new Error(
        `The token (${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}) was not found on the current network (${getNetworkName(connection.rpcEndpoint)}). Please check your network selection.`
      );
    }

    // トークンプログラムIDの確認
    const isValidOwner =
      mintAccountInfo.owner.equals(TOKEN_PROGRAM_ID) ||
      mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);

    if (!isValidOwner) {
      console.error(
        `Invalid mint account owner: ${mintAccountInfo.owner.toBase58()}`
      );
      throw new Error(
        `The specified address is not a valid token mint on the current network (${getNetworkName(connection.rpcEndpoint)}). Please verify the token mint address.`
      );
    }

    console.log(
      `Mint account validated: ${mintAddress}, owner: ${mintAccountInfo.owner.toBase58()}`
    );
    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw error; // 既にフォーマット済みのエラーはそのまま投げる
    }
    console.error('Error validating mint address:', error);
    throw new Error(`Invalid token mint address: ${mintAddress}`);
  }
};
