// src/hooks/useConnection.ts
import { Connection } from "@solana/web3.js";
import { useMemo } from 'react';

const RPC_ENDPOINT = import.meta.env.VITE_RPC_ENDPOINT;
if (!RPC_ENDPOINT) {
  throw new Error('RPC_ENDPOINT is not defined');
}

export const useConnection = () => {
  const connection = useMemo(() => 
    new Connection(RPC_ENDPOINT, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 60000
    }), 
  []);

  return { connection };
};