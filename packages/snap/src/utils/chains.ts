export const CHAINS_INFO : { [key: string]: {url: string, nativeToken: string } }= {
  // Ethereum Mainnet
  '0x1': {url: 'https://etherscan.io/address/', nativeToken: 'ETH' },
  // Sepolia Testnet
  'eip155:11155111': {url: 'https://sepolia.etherscan.io/address/', nativeToken: 'ETH' },
  // BSC Mainnet
  '0x38': { url: 'https://bscscan.com/address/', nativeToken: 'BNB' },
  // BSC Testnet
  'eip155:61': { url: 'https://testnet.bscscan.com/address/', nativeToken: 'TBNB' },
};
