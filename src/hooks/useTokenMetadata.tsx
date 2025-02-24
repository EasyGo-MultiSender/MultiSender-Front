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
import { mplTokenMetadata as Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { Metaplex } from "@metaplex-foundation/js";

const METAPLEX_PROGRAM_ID = new PublicKey(import.meta.env.VITE_METAPLEX_PROGRAM_ID);
const TOKEN_PROGRAM_ID = new PublicKey(import.meta.env.VITE_TOKEN_PROGRAM_ID);
const TOKEN_2022_PROGRAM_ID = new PublicKey(import.meta.env.VITE_TOKEN_2022_PROGRAM_ID);

export interface TokenMetadata {
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  programId?: PublicKey;
}

/* ---------------------------------------------------
/  作成ロジックの流れ
/  1. @solana/spl-token の token-list(オフチェーン)からtokenのmetadataを取得
/  2. @metaplex-foundation/js の findByMintを使って、programId が TOKEN_PROGRAM_ID のmetadataを取得
/  3. @solana/spl-token-metadata の unpackToken2022Metadata を使って、programId が TOKEN_2022_PROGRAM_ID のmetadataを取得
/  4. それぞれのmetadataを統合して TokenMetadata 型にまとめる
/  --------------------------------------------------- */

export const useTokenMetadata = (connection: Connection) => {
  const [metadataCache, setMetadataCache] = useState<Map<string, TokenMetadata>>(new Map());

  const fetchMetadata = useCallback(
    async (mintAddress: string): Promise<TokenMetadata | null> => {
      try {
        // 既にキャッシュ済みならそれを返す
        if (metadataCache.has(mintAddress)) {
          return metadataCache.get(mintAddress) || null;
        }

        // Mint PublicKey を生成
        const mintPubkey = new PublicKey(mintAddress);
        console.log("Fetching metadata for Mint:", mintPubkey.toBase58());

        // Metaplex SDK を初期化
        const metaplex = new Metaplex(connection);

        // NFT or SFT(=fungible token) いずれでも findByMint が使える
        const nftOrSft = await metaplex.nfts().findByMint({ mintAddress: mintPubkey });

        // name, symbol, uri をコンソールに出力
        console.log("Name:", nftOrSft.name);
        console.log("Symbol:", nftOrSft.symbol);
        console.log("Uri:", nftOrSft.uri);

        // uriが画像かjsonかによって処理を分岐
        // 画像の場合はそのまま返す
        if (nftOrSft.uri.includes(".png") || nftOrSft.uri.includes(".jpg")) {
          const TokenUri = nftOrSft.uri;
          return { mint: mintPubkey, name: nftOrSft.name, symbol: nftOrSft.symbol, uri: TokenUri || nftOrSft.uri };
        }
        // jsonの場合はjsonの中にあるuriまたはimageを取得して返す
        else {
          const jsonUri = await fetch(nftOrSft.uri);
          const jsonUriData = await jsonUri.json();
          const TokenUri = jsonUriData.image || jsonUriData.uri;
          return { mint: mintPubkey, name: nftOrSft.name, symbol: nftOrSft.symbol, uri: TokenUri || nftOrSft.uri };
        }

        const tokenMetadata: TokenMetadata = {
          mint: mintPubkey,
          name: nftOrSft.name,
          symbol: nftOrSft.symbol,
          uri: nftOrSft.uri,
        };

        // 

        // キャッシュに保存
        setMetadataCache((prevCache) => {
          const newCache = new Map(prevCache);
          newCache.set(mintAddress, tokenMetadata);
          return newCache;
        });

        return tokenMetadata;
      } catch (error) {
        console.error(`Error fetching metadata for ${mintAddress}:`, error);
        return null;
      }
    },
    [connection, metadataCache]
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