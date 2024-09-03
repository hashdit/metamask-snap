export const CHAINS_INFO: {
	[key: string]: { url: string; nativeToken: string };
} = {
	// Ethereum Mainnet
	'0x1': { url: 'https://etherscan.io/address/', nativeToken: 'ETH' },
	// Sepolia Testnet
	'0xaa36a7': {
		url: 'https://sepolia.etherscan.io/address/',
		nativeToken: 'ETH',
	},
	// BSC Mainnet
	'0x38': { url: 'https://bscscan.com/address/', nativeToken: 'BNB' },
	// BSC Testnet
	'0x61': {
		url: 'https://testnet.bscscan.com/address/',
		nativeToken: 'tBNB',
	},
	// OpBNB Mainnet
	'0xcc': { url: 'https://opbnbscan.com/address/', nativeToken: 'BNB' },
	// OpBNB Testnet
	'0x15eb': {
		url: 'https://testnet.opbnbscan.com/address/',
		nativeToken: 'tBNB',
	},
	// Arbitrum Mainnet
	'0xa4b1': { url: 'https://arbiscan.io/address/', nativeToken: 'ETH' },
	// Polygon Mainnet
	'0x89': { url: 'https://polygonscan.com/address/', nativeToken: 'MATIC' },
	// Optimism Mainnet
	'0xa': {
		url: 'https://optimistic.etherscan.io/address/',
		nativeToken: 'ETH',
	},
	// Avalanche C-Chain Mainnet
	'0xa86a': { url: 'https://snowtrace.io/address/', nativeToken: 'AVAX' },
	// Cronos Mainnet
	'0x19': { url: 'https://cronoscan.com/address/', nativeToken: 'CRO' },
	// Base Mainnet
	'0x2105': { url: 'https://basescan.org/address/', nativeToken: 'ETH' },
	// Fatom Mainnet
	'0xfa': { url: 'https://ftmscan.com/address/', nativeToken: 'FTM' },
};
