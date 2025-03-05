// RPCエンドポイントとネットワーク情報のロギング
import { Connection } from '@solana/web3.js';

// ネットワーク名を取得する関数
export const getNetworkName = (rpcEndpoint: string): string => {
  if (rpcEndpoint.includes('devnet')) return 'Devnet';
  if (rpcEndpoint.includes('testnet')) return 'Testnet';
  return 'Mainnet Beta';
};

export const logConnectionInfo = async (
  connection: Connection
): Promise<boolean> => {
  try {
    console.log(`Current RPC endpoint: ${connection.rpcEndpoint}`);
    console.log(
      `Network appears to be: ${getNetworkName(connection.rpcEndpoint)}`
    );

    // 接続確認
    const blockHeight = await connection.getBlockHeight();
    console.log(`Connection verified, current block height: ${blockHeight}`);
    return true;
  } catch (error) {
    console.error('Failed to verify RPC connection:', error);
    return false;
  }
};
