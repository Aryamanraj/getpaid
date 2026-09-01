import type { QueryRunner } from 'typeorm';

/**
 * The chain and asset registry. Adding USDC on a new chain is a row here or an
 * admin write — never a code change.
 *
 * ⚠ Token contract addresses below are the well-known canonical issuances.
 * VERIFY EVERY ONE against the issuer's own registry (circle.com,
 * tether.to) before pointing production traffic at them. A wrong contract
 * address means a payer's QR sends the wrong token, or verification silently
 * never matches.
 */
export default async function seed(qr: QueryRunner): Promise<void> {
  const chains = [
    {
      Namespace: 'eip155',
      ChainRef: '1',
      Name: 'Ethereum',
      Slug: 'ethereum',
      NativeSymbol: 'ETH',
      NativeDecimals: 18,
      RequiredConfirmations: 12,
      ExplorerTxUrlTemplate: 'https://etherscan.io/tx/{txHash}',
      SortOrder: 0,
    },
    {
      Namespace: 'eip155',
      ChainRef: '8453',
      Name: 'Base',
      Slug: 'base',
      NativeSymbol: 'ETH',
      NativeDecimals: 18,
      RequiredConfirmations: 5,
      ExplorerTxUrlTemplate: 'https://basescan.org/tx/{txHash}',
      SortOrder: 1,
    },
    {
      Namespace: 'eip155',
      ChainRef: '42161',
      Name: 'Arbitrum One',
      Slug: 'arbitrum',
      NativeSymbol: 'ETH',
      NativeDecimals: 18,
      RequiredConfirmations: 5,
      ExplorerTxUrlTemplate: 'https://arbiscan.io/tx/{txHash}',
      SortOrder: 2,
    },
    {
      Namespace: 'eip155',
      ChainRef: '137',
      Name: 'Polygon',
      Slug: 'polygon',
      NativeSymbol: 'POL',
      NativeDecimals: 18,
      RequiredConfirmations: 30,
      ExplorerTxUrlTemplate: 'https://polygonscan.com/tx/{txHash}',
      SortOrder: 3,
    },
    {
      Namespace: 'solana',
      ChainRef: 'mainnet-beta',
      Name: 'Solana',
      Slug: 'solana',
      NativeSymbol: 'SOL',
      NativeDecimals: 9,
      RequiredConfirmations: 1,
      ExplorerTxUrlTemplate: 'https://solscan.io/tx/{txHash}',
      SortOrder: 4,
    },
    {
      Namespace: 'bip122',
      ChainRef: 'mainnet',
      Name: 'Bitcoin',
      Slug: 'bitcoin',
      NativeSymbol: 'BTC',
      NativeDecimals: 8,
      RequiredConfirmations: 2,
      ExplorerTxUrlTemplate: 'https://mempool.space/tx/{txHash}',
      SortOrder: 5,
    },
    {
      Namespace: 'tron',
      ChainRef: 'mainnet',
      Name: 'Tron',
      Slug: 'tron',
      NativeSymbol: 'TRX',
      NativeDecimals: 6,
      RequiredConfirmations: 19,
      ExplorerTxUrlTemplate: 'https://tronscan.org/#/transaction/{txHash}',
      SortOrder: 6,
    },
  ];

  for (const c of chains) {
    await qr.query(
      `INSERT INTO core."Chains"
         ("Namespace", "ChainRef", "Name", "Slug", "NativeSymbol",
          "NativeDecimals", "ExplorerTxUrlTemplate", "RequiredConfirmations", "SortOrder")
       VALUES ($1::chain_namespace_enum, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT ("Namespace", "ChainRef") DO NOTHING`,
      [
        c.Namespace,
        c.ChainRef,
        c.Name,
        c.Slug,
        c.NativeSymbol,
        c.NativeDecimals,
        c.ExplorerTxUrlTemplate,
        c.RequiredConfirmations,
        c.SortOrder,
      ],
    );
  }

  // [chainSlug, symbol, name, contractAddress|null, decimals, isStablecoin, sortOrder]
  const assets: Array<
    [string, string, string, string | null, number, boolean, number]
  > = [
    ['ethereum', 'ETH', 'Ether', null, 18, false, 0],
    [
      'ethereum',
      'USDC',
      'USD Coin',
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      6,
      true,
      1,
    ],
    [
      'ethereum',
      'USDT',
      'Tether USD',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      6,
      true,
      2,
    ],

    ['base', 'ETH', 'Ether', null, 18, false, 0],
    [
      'base',
      'USDC',
      'USD Coin',
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      6,
      true,
      1,
    ],

    ['arbitrum', 'ETH', 'Ether', null, 18, false, 0],
    [
      'arbitrum',
      'USDC',
      'USD Coin',
      '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      6,
      true,
      1,
    ],
    [
      'arbitrum',
      'USDT',
      'Tether USD',
      '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      6,
      true,
      2,
    ],

    ['polygon', 'POL', 'Polygon', null, 18, false, 0],
    [
      'polygon',
      'USDC',
      'USD Coin',
      '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      6,
      true,
      1,
    ],
    [
      'polygon',
      'USDT',
      'Tether USD',
      '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      6,
      true,
      2,
    ],

    ['solana', 'SOL', 'Solana', null, 9, false, 0],
    [
      'solana',
      'USDC',
      'USD Coin',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      6,
      true,
      1,
    ],
    [
      'solana',
      'USDT',
      'Tether USD',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      6,
      true,
      2,
    ],

    ['bitcoin', 'BTC', 'Bitcoin', null, 8, false, 0],

    ['tron', 'TRX', 'Tron', null, 6, false, 0],
    [
      'tron',
      'USDT',
      'Tether USD',
      'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      6,
      true,
      1,
    ],
  ];

  for (const [
    slug,
    symbol,
    name,
    contract,
    decimals,
    isStable,
    sortOrder,
  ] of assets) {
    await qr.query(
      `INSERT INTO core."Assets"
         ("ChainID", "Symbol", "Name", "ContractAddress", "Decimals", "IsStablecoin", "SortOrder")
       SELECT c."ChainID", $2, $3, $4, $5, $6, $7
         FROM core."Chains" c
        WHERE c."Slug" = $1
       ON CONFLICT DO NOTHING`,
      [slug, symbol, name, contract, decimals, isStable, sortOrder],
    );
  }
}
