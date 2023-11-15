import { ethers } from 'ethers';


export const extractPublicKeyFromSignature = (message, signature) => {
  try {
    // The message that was signed needs to be the same
    const messageHash = ethers.utils.hashMessage(message);
    const recoveredPublicKey = ethers.utils.recoverPublicKey(messageHash, signature);

    return recoveredPublicKey;
  } catch (error) {
    console.error('Error extracting public key:', error);
    throw error;
  }
};