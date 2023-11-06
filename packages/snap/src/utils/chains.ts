export const SUPPORTED_CHAINS : { [key: string]: {url: string, nativeToken: string } }= {
  // Ethereum Mainnet
  'eip155:1': {url: 'https://etherscan.io/address/', nativeToken: 'ETH' },
  // Sepolia Testnet
  'eip155:11155111': {url: 'https://sepolia.etherscan.io/address/', nativeToken: 'ETH' },
  // BSC Mainnet
  'eip155:89': { url: 'https://bscscan.com/address/', nativeToken: 'BNB' },
  // BSC Testnet
  'eip155:61': { url: 'https://testnet.bscscan.com/address/', nativeToken: 'TBNB' },
};
