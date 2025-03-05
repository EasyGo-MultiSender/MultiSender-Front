import { Connection } from '@solana/web3.js';

// トランザクションの確認を待機する関数
export const waitForTransactionConfirmation = async (
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number
): Promise<boolean> => {
  const TRANSACTION_TIMEOUT =
    Number(import.meta.env.VITE_TRANSACTION_TIMEOUT) || 120000;

  const startTime = Date.now();
  console.log(`Waiting for confirmation of transaction ${signature}`);

  const POLLING_INTERVAL = 1000;

  while (Date.now() - startTime < TRANSACTION_TIMEOUT) {
    try {
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err === null) {
        console.log(`Transaction ${signature} confirmed successfully`);
        return true;
      }

      if (confirmation.value.err) {
        console.error(
          `Transaction ${signature} failed with error:`,
          confirmation.value.err
        );
        return false;
      }
    } catch (error) {
      console.warn(
        `Confirmation check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
  }

  console.error(`Transaction ${signature} confirmation timed out`);
  throw new Error(`Transaction confirmation timed out`);
};
