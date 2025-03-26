import { Metaplex } from '@metaplex-foundation/js';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  unpackMint,
  getMetadataPointerState,
  getExtensionData,
  ExtensionType,
} from '@solana/spl-token';
import { unpack as unpackToken2022Metadata } from '@solana/spl-token-metadata';
import { useCallback, useRef } from 'react';

// const METAPLEX_PROGRAM_ID = new PublicKey(import.meta.env.VITE_METAPLEX_PROGRAM_ID);
const TOKEN_PROGRAM_ID = new PublicKey(import.meta.env.VITE_TOKEN_PROGRAM_ID);
const TOKEN_2022_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_TOKEN_2022_PROGRAM_ID
);
import { stopFetchMetadata } from '@/pages/Sender/Sender';

// TokenStandardの値の意味
enum TokenStandard {
  NonFungible = 0, // NFT
  // Fungible = 1,            // SPL
  // FungibleAsset = 2,       // SPL
  NonFungibleEdition = 3, // NFT
  ProgrammableNonFungible = 4, // NFT
}

// NFTかどうかを判断する関数
function isNFTbyTokenStandard(
  tokenStandard: number | null | undefined
): boolean {
  if (tokenStandard === null || tokenStandard === undefined) return false;

  return (
    tokenStandard === TokenStandard.NonFungible ||
    tokenStandard === TokenStandard.NonFungibleEdition ||
    tokenStandard === TokenStandard.ProgrammableNonFungible
  );
}

export interface TokenMetadata {
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  programId?: PublicKey;
  decimals?: number; // デシマル情報を追加
}

// トークンリストの型定義
interface TokenListItem {
  address: string;
  name: string;
  symbol: string;
  logoURI: string;
  decimals?: number; // デシマル情報を追加
  extensions?: {
    website?: string;
    description?: string;
  };
}

interface TokenList {
  tokens: TokenListItem[];
}

// トークンリストのキャッシュ
const tokenListCache = new Map<string, TokenList>();

// 1. @solana/spl-token の token-list(オフチェーン)からtokenのmetadataを取得
export const useOffChainTokenMetadata = (connection: Connection) => {
  // キャッシュをuseRefに変更してレンダリングループを防ぐ
  const metadataCacheRef = useRef<Map<string, TokenMetadata>>(new Map());

  const fetchOffChainMetadata = useCallback(
    async (mintAddress: string): Promise<TokenMetadata | null> => {
      try {
        // 既にキャッシュ済みならそれを返す
        if (metadataCacheRef.current.has(mintAddress)) {
          return metadataCacheRef.current.get(mintAddress) || null;
        }

        const mintPubkey = new PublicKey(mintAddress);

        // アカウント情報を取得
        const accountInfo = await connection.getAccountInfo(mintPubkey);
        if (!accountInfo) return null;

        // トークンプログラムIDを確認
        if (
          accountInfo.owner.equals(TOKEN_PROGRAM_ID) ||
          accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ) {
          // ミント情報を取得してデシマルをチェック
          try {
            const mintInfo = accountInfo.owner.equals(TOKEN_PROGRAM_ID)
              ? unpackMint(mintPubkey, accountInfo, TOKEN_PROGRAM_ID)
              : unpackMint(mintPubkey, accountInfo, TOKEN_2022_PROGRAM_ID);

            if (mintInfo) {
              // NFTの場合はスキップ (デシマルが0のトークンはNFTと見なす)
              // tokenStandardを使用するためコメントアウト
              // if (mintInfo.decimals < SPL_TOKEN_MIN_DECIMALS) {
              //   return null;
              // }

              // Solana Token Listから情報を取得
              const tokenInfo = await fetchFromTokenList(mintAddress);

              if (tokenInfo) {
                // URI (logoURI) が存在しない場合は返却しない
                if (!tokenInfo.logoURI) {
                  return null;
                }

                const tokenMetadata: TokenMetadata = {
                  mint: mintPubkey,
                  name: tokenInfo.name,
                  symbol: tokenInfo.symbol,
                  uri: tokenInfo.logoURI,
                  programId: accountInfo.owner,
                  decimals: mintInfo.decimals,
                };

                // キャッシュに保存 (useRefを使用)
                metadataCacheRef.current.set(mintAddress, tokenMetadata);

                return tokenMetadata;
              }
            }
          } catch (error) {
            console.log(error);
            return null;
          }
        }

        return null;
      } catch (error) {
        console.log(error);
        return null;
      }
    },
    [connection] // metadataCacheを依存配列から削除
  );

  const clearCache = useCallback(() => {
    metadataCacheRef.current = new Map();
  }, []);

  // Solana Token Listから情報を取得する関数
  const fetchFromTokenList = async (
    mintAddress: string
  ): Promise<TokenListItem | null> => {
    try {
      // 主要なトークンリストのURLs
      const tokenListUrls = [
        'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json',
      ];

      for (const url of tokenListUrls) {
        // キャッシュを確認
        if (!tokenListCache.has(url)) {
          const response = await fetch(url);
          if (!response.ok) continue;

          const data = await response.json();
          const tokenList: TokenList = data.tokens
            ? data
            : { tokens: data.data || [] };
          tokenListCache.set(url, tokenList);
        }

        const tokenList = tokenListCache.get(url);
        if (!tokenList) continue;

        // ミントアドレスに一致するトークンを探す
        const token = tokenList.tokens.find(
          (t) => t.address.toLowerCase() === mintAddress.toLowerCase()
        );

        // デシマルを確認し、SPL_TOKEN_MIN_DECIMALS未満のトークン（NFT）を除外
        // tokenStandardを使用するためコメントアウト
        // if (
        //   token &&
        //   (!token.decimals || token.decimals >= SPL_TOKEN_MIN_DECIMALS)
        // ) {
        if (token) {
          return token;
        }
      }

      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  return { fetchOffChainMetadata, clearCache };
};

// 2. programId が TOKEN_PROGRAM_ID の場合、@metaplex-foundation/js の findByMint を使ってmetadataを取得
export const useTokenMetadata = (connection: Connection) => {
  // キャッシュをuseRefに変更してレンダリングループを防ぐ
  const metadataCacheRef = useRef<Map<string, TokenMetadata>>(new Map());
  const { fetchOffChainMetadata } = useOffChainTokenMetadata(connection);

  const fetchMetadata = useCallback(
    async (
      mintAddress: string,
      stopChecking: boolean = false
    ): Promise<TokenMetadata | null> => {
      try {
        // 読み込みストップ！
        if (stopChecking && stopFetchMetadata) return null;

        // 既にキャッシュ済みならそれを返す
        if (metadataCacheRef.current.has(mintAddress)) {
          return metadataCacheRef.current.get(mintAddress) || null;
        }

        // 読み込みストップ！
        if (stopChecking && stopFetchMetadata) return null;

        // Mint PublicKey を生成
        const mintPubkey = new PublicKey(mintAddress);

        // Token Programがあるかチェックする
        const accountInfo = await connection.getAccountInfo(mintPubkey);
        if (!accountInfo) return null;

        // トークンプログラムかどうか確認
        if (
          !accountInfo.owner.equals(TOKEN_PROGRAM_ID) &&
          !accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)
        ) {
          return null; // トークンプログラムでない場合はスキップ
        }

        // 読み込みストップ！
        if (stopChecking && stopFetchMetadata) return null;

        // ミント情報を取得してデシマルをチェック
        let decimals = 0;
        try {
          const mintInfo = accountInfo.owner.equals(TOKEN_PROGRAM_ID)
            ? unpackMint(mintPubkey, accountInfo, TOKEN_PROGRAM_ID)
            : unpackMint(mintPubkey, accountInfo, TOKEN_2022_PROGRAM_ID);

          // 読み込みストップ！
          if (stopChecking && stopFetchMetadata) return null;

          if (mintInfo) {
            decimals = mintInfo.decimals;

            // NFTの場合はスキップ (デシマルが0のトークンはNFTと見なす)
            // tokenStandardを使用するためコメントアウト
            // if (decimals < SPL_TOKEN_MIN_DECIMALS) {
            //   return null;
            // }
          } else {
            return null; // ミント情報が取得できない場合はスキップ
          }
        } catch (error) {
          console.log(error);
          return null;
        }

        // 読み込みストップ！
        if (stopChecking && stopFetchMetadata) return null;

        let tokenMetadata: TokenMetadata | null = null;

        // 1. まずオフチェーンのトークンリストから取得
        tokenMetadata = await fetchOffChainMetadata(mintAddress);

        // 読み込みストップ！
        if (stopChecking && stopFetchMetadata) return null;

        // 2. オフチェーンで見つからなかった場合、TOKEN_PROGRAM_ID (Metaplex) で試す
        if (!tokenMetadata && accountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
          try {
            // Metaplex SDK を初期化
            const metaplex = new Metaplex(connection);

            // 読み込みストップ！
            if (stopChecking && stopFetchMetadata) return null;

            // NFT or SFT(=fungible token) いずれでも findByMint が使える
            // ここでエラーが発生するため、try-catchで囲む
            try {
              const nftOrSft = await metaplex
                .nfts()
                .findByMint({ mintAddress: mintPubkey });

              // tokenStandardでNFTかどうかを判断
              // 0: NonFungible, 3: NonFungibleEdition, 4: ProgrammableNonFungible はNFT
              const isNFT = isNFTbyTokenStandard(nftOrSft.tokenStandard);

              // 読み込みストップ！
              if (stopChecking && stopFetchMetadata) return null;

              if (isNFT) {
                console.log(
                  `Token ${mintAddress} is an NFT with tokenStandard ${nftOrSft.tokenStandard}`
                );
                return null; // NFTの場合はnullを返してSPLリストに表示しない
              }

              if (nftOrSft.uri) {
                try {
                  // 読み込みストップ！
                  if (stopChecking && stopFetchMetadata) return null;

                  // fetchでレスポンスを取得して、Content-Typeを確認
                  const response = await fetch(nftOrSft.uri);
                  const contentType =
                    response.headers.get('content-type') || '';

                  let resolvedUri: string;

                  if (contentType.includes('application/json')) {
                    // JSONデータをパース
                    const jsonData = await response.json();
                    // imageフィールドやuriフィールドがある想定
                    resolvedUri =
                      jsonData.image || jsonData.uri || nftOrSft.uri;
                  } else if (
                    contentType.includes('image/png') ||
                    contentType.includes('image/jpeg') ||
                    contentType.includes('image/gif')
                  ) {
                    // 画像の場合はそのままURLを使う
                    resolvedUri = nftOrSft.uri;
                  } else {
                    // それ以外のContent-Typeであれば一旦デフォルトとして
                    resolvedUri = nftOrSft.uri;
                  }

                  // 読み込みストップ！
                  if (stopChecking && stopFetchMetadata) return null;

                  // URIが見つからない場合は返却しない
                  if (resolvedUri) {
                    tokenMetadata = {
                      mint: mintPubkey,
                      name: nftOrSft.name,
                      symbol: nftOrSft.symbol,
                      uri: resolvedUri,
                      programId: TOKEN_PROGRAM_ID,
                      decimals: decimals,
                    };
                  }
                } catch (fetchError) {
                  console.log('Failed to fetch token URI:', fetchError);
                  // URI取得に失敗した場合でも基本情報は返却
                  tokenMetadata = {
                    mint: mintPubkey,
                    name: nftOrSft.name || 'Unknown',
                    symbol: nftOrSft.symbol || 'UNKNOWN',
                    uri: nftOrSft.uri || '',
                    programId: TOKEN_PROGRAM_ID,
                    decimals: decimals,
                  };
                }

                // 読み込みストップ！
                if (stopChecking && stopFetchMetadata) return null;
              }
            } catch (metaplexError) {
              // AccountNotFoundError が発生する場合、このトークンはMetaplexメタデータを持っていない
              // console.log(`Metaplex metadata not found for token ${mintAddress}: ${metaplexError instanceof Error ? metaplexError.message : 'Unknown error'}`);

              // エラーが発生した場合は、基本的な情報だけでトークンメタデータを生成
              // ここでスキップせず、最低限の情報でメタデータを生成
              tokenMetadata = {
                mint: mintPubkey,
                name: `Token ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
                symbol: 'TOKEN',
                uri: '/token-placeholder.png', // プレースホルダー画像
                programId: TOKEN_PROGRAM_ID,
                decimals: decimals,
              };
            }
          } catch (outerError) {
            console.error(
              'Unexpected error in Metaplex processing:',
              outerError
            );
            // 予期せぬエラーの場合も基本情報を返却
            tokenMetadata = {
              mint: mintPubkey,
              name: `Token ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
              symbol: 'TOKEN',
              uri: '/token-placeholder.png',
              programId: TOKEN_PROGRAM_ID,
              decimals: decimals,
            };
          }
        }

        // 読み込みストップ！
        if (stopChecking && stopFetchMetadata) return null;

        // 3. TOKEN_2022_PROGRAM_ID の場合
        if (!tokenMetadata && accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
          try {
            tokenMetadata = await findToken2022Metadata(
              mintPubkey,
              connection,
              decimals
            );

            // Token2022メタデータが見つからない場合も基本情報を返却
            if (!tokenMetadata) {
              tokenMetadata = {
                mint: mintPubkey,
                name: `Token2022 ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
                symbol: 'TOKEN',
                uri: '/token-placeholder.png',
                programId: TOKEN_2022_PROGRAM_ID,
                decimals: decimals,
              };
            }
          } catch (token2022Error) {
            console.log(
              'Error in Token2022 metadata processing:',
              token2022Error
            );
            // エラーが発生した場合も基本情報を返却
            tokenMetadata = {
              mint: mintPubkey,
              name: `Token2022 ${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
              symbol: 'TOKEN',
              uri: '/token-placeholder.png',
              programId: TOKEN_2022_PROGRAM_ID,
              decimals: decimals,
            };
          }
        }

        // 読み込みストップ！
        if (stopChecking && stopFetchMetadata) return null;

        // メタデータが見つかった場合はキャッシュする (useRefを使用)
        if (tokenMetadata) {
          metadataCacheRef.current.set(mintAddress, tokenMetadata);
        }

        return tokenMetadata;
      } catch (error) {
        console.error('Error in fetchMetadata:', error);
        // 最終的なエラーの場合でも null を返さず、代替情報を提供
        try {
          const mintPubkey = new PublicKey(mintAddress);
          return {
            mint: mintPubkey,
            name: `Unknown Token (${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)})`,
            symbol: 'UNKNOWN',
            uri: '/token-placeholder.png',
            decimals: 9, // デフォルトのデシマル値
          };
        } catch {
          return null; // PublicKey の作成すら失敗した場合のみ null
        }
      }
    },
    [connection, fetchOffChainMetadata] // metadataCacheを依存配列から削除
  );

  const clearCache = useCallback(() => {
    metadataCacheRef.current = new Map();
  }, []);

  return { fetchMetadata, clearCache };
};

async function findToken2022Metadata(
  mintPubkey: PublicKey,
  connection: Connection,
  decimals: number
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
      const originalUri = cleanString(metadata.uri);

      // URIが空の場合は返却しない
      if (!originalUri) {
        return {
          mint: mintPubkey,
          name:
            cleanString(metadata.name) ||
            `Token ${mintPubkey.toBase58().slice(0, 4)}...`,
          symbol: cleanString(metadata.symbol) || 'TOKEN',
          uri: '/token-placeholder.png',
          programId: TOKEN_2022_PROGRAM_ID,
          decimals: decimals,
        };
      }

      try {
        // URIの内容を取得
        const response = await fetch(originalUri);
        const contentType = response.headers.get('content-type') || '';

        let resolvedUri: string;

        if (contentType.includes('application/json')) {
          // JSONデータをパース
          const jsonData = await response.json();
          // imageフィールドやuriフィールドがある想定
          resolvedUri = jsonData.image || jsonData.uri || originalUri;
        } else if (
          contentType.includes('image/png') ||
          contentType.includes('image/jpeg') ||
          contentType.includes('image/gif')
        ) {
          // 画像の場合はそのままURLを使う
          resolvedUri = originalUri;
        } else {
          // それ以外のContent-Typeであれば一旦デフォルトとして
          resolvedUri = originalUri;
        }

        // 最終的なURIが空の場合は代替URI
        if (!resolvedUri) {
          resolvedUri = '/token-placeholder.png';
        }

        return {
          mint: mintPubkey,
          name: cleanString(metadata.name),
          symbol: cleanString(metadata.symbol),
          uri: resolvedUri,
          programId: TOKEN_2022_PROGRAM_ID,
          decimals: decimals,
        };
      } catch (fetchError) {
        // フェッチに失敗した場合でも、元のURIを使用
        return {
          mint: mintPubkey,
          name: cleanString(metadata.name),
          symbol: cleanString(metadata.symbol),
          uri: originalUri || '/token-placeholder.png',
          programId: TOKEN_2022_PROGRAM_ID,
          decimals: decimals,
        };
      }
    }
  } catch (err) {
    console.log('Error in findToken2022Metadata:', err);
  }

  // すべてのチェックに失敗した場合はnullを返す
  return null;
}

function cleanString(value: string): string {
  if (!value) return '';
  return value.replace(/\u0000/g, '').trim();
}
