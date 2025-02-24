import { useCallback, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  unpackMint,
  getMetadataPointerState,
  getExtensionData,
  ExtensionType,
  getMint,
} from "@solana/spl-token";
import {
  TokenMetadata as T2022Metadata,
  unpack as unpackToken2022Metadata,
} from "@solana/spl-token-metadata";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";

const METAPLEX_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export interface TokenMetadata {
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  programId?: PublicKey;
}

export const useTokenMetadata = (connection: Connection) => {
  const [metadataCache, setMetadataCache] = useState<Map<string, TokenMetadata>>(
    new Map()
  );

  const fetchMetadata = useCallback(
    async (mintAddress: string): Promise<TokenMetadata | null> => {
      try {
        // キャッシュチェック
        if (metadataCache.has(mintAddress)) {
          return metadataCache.get(mintAddress) || null;
        }

        const mintPubkey = new PublicKey(mintAddress);
        
        // mintアカウントの情報を取得してプログラムIDを判定
        const [metadataPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("metadata"), METAPLEX_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
          METAPLEX_PROGRAM_ID
        );
        const accountInfo = await connection.getAccountInfo(metadataPDA);
        console.log("accountInfo", accountInfo?.data.toString());

        // デバッグ出力: バイナリデータの詳細
        console.log("Raw data length:", accountInfo?.data.length);
        console.log("First few bytes:", Buffer.from(accountInfo?.data).slice(0, 10));

        // Metaplexのメタデータをデシリアライズ
        const [metadata] = Metadata.deserialize(accountInfo?.data);
        
        // デシリアライズしたデータの詳細を出力
        console.log("\nDeserialized Metadata:");
        console.log("===================");
        console.log("Name:", metadata.data.name);
        console.log("Symbol:", metadata.data.symbol);
        console.log("URI:", metadata.data.uri);
        console.log("Seller Fee Basis Points:", metadata.data.sellerFeeBasisPoints);
        console.log("Creators:", metadata.data.creators);
        
        // メタデータの構造体全体をJSON形式で出力
        console.log("\nFull Metadata Structure:");
        console.log(JSON.stringify(metadata, null, 2));

        // データの検証
        console.log("\nValidation:");
        console.log("Name length:", metadata.data.name.length);
        console.log("Symbol length:", metadata.data.symbol.length);
        console.log("URI length:", metadata.data.uri.length);

        // let metadata: TokenMetadata | null = null;

        // // Token 2022の場合
        // if (programId.equals(TOKEN_2022_PROGRAM_ID)) {
        //   metadata = await findToken2022Metadata(mintPubkey, connection);
        // }

        // // メタデータが見つからない場合はMetaplexを試行
        // if (!metadata) {
        //   metadata = await fetchMetaplexMetadata(mintPubkey, connection);
        // }

        // if (metadata) {
        //   metadata.programId = programId;
        //   setMetadataCache((prevCache) => {
        //     const newCache = new Map(prevCache);
        //     newCache.set(mintAddress, metadata!);
        //     return newCache;
        //   });
        // }

        return metadata;
      } catch (error) {
        console.error(`Error fetching metadata for ${mintAddress}:`, error);
        return null;
      }
    },
    [connection]
  );

  const clearCache = useCallback(() => {
    setMetadataCache(new Map());
  }, []);

  return { fetchMetadata, clearCache };
};

async function findToken2022Metadata(
  mintPubkey: PublicKey,
  connection: Connection
): Promise<TokenMetadata | null> {
  try {
    const accountInfo = await connection.getAccountInfo(mintPubkey);
    if (!accountInfo) return null;

    const mintInfo = unpackMint(mintPubkey, accountInfo, TOKEN_2022_PROGRAM_ID);
    if (!mintInfo) return null;

    const metadataPointer = getMetadataPointerState(mintInfo);
    if (!metadataPointer?.metadataAddress) return null;

    const metadataExtension = getExtensionData(
      ExtensionType.TokenMetadata,
      mintInfo.tlvData
    );
    
    if (!metadataExtension) return null;
    
    const metadata = unpackToken2022Metadata(metadataExtension);
    
    if (metadata && metadata.mint.equals(mintPubkey)) {
      return {
        mint: mintPubkey,
        name: cleanString(metadata.name),
        symbol: cleanString(metadata.symbol),
        uri: cleanString(metadata.uri),
        programId: TOKEN_2022_PROGRAM_ID
      };
    }
  } catch (err) {
    console.error("Error fetching Token 2022 metadata:", err);
  }
  return null;
}

async function fetchMetaplexMetadata(
  mintPubkey: PublicKey,
  connection: Connection,
  retryCount = 3
): Promise<TokenMetadata | null> {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METAPLEX_PROGRAM_ID.toBuffer(),
          mintPubkey.toBuffer(),
        ],
        METAPLEX_PROGRAM_ID
      );

      const accountInfo = await connection.getAccountInfo(metadataPDA);
      if (!accountInfo) {
        if (attempt === retryCount) {
          console.log(`Metadata not found for ${mintPubkey.toBase58()}`);
        }
        continue;
      }

      const metadata = Metadata.deserialize(accountInfo.data)[0];

      return {
        mint: mintPubkey,
        name: cleanString(metadata.data.name),
        symbol: cleanString(metadata.data.symbol),
        uri: cleanString(metadata.data.uri),
        programId: TOKEN_PROGRAM_ID
      };
    } catch (error) {
      if (attempt === retryCount) {
        console.error("Failed to fetch Metaplex metadata:", error);
      }
    }
  }
  return null;
}

function cleanString(value: string): string {
  return value.replace(/\u0000/g, "").trim();
}