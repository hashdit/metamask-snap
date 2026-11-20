/* eslint-disable */
import { ethers } from 'ethers';

export const extractPublicKeyFromSignature = (message: any, signature: any, from: any) => {
	try {
		// Ensure the message is equal to the expected message, otherwise any arbitrary message + signature can be used.
		const expectedMessage = `Hashdit Security: ${from}, Please sign this message to authenticate the HashDit API.`;
		if (message !== expectedMessage) {
			throw new Error(`Invalid message. Expected: "${expectedMessage}", Received: "${message}"`);
		}
		const hash = ethers.hashMessage(message);
		// recoverPublicKey returns an uncompressed key prefixed with 0x04; strip the prefix byte.
		const publicKey = '0x' + ethers.SigningKey.recoverPublicKey(hash, signature).slice(4);

		return publicKey;
	} catch (error) {
		//console.error('Error extracting public key:', error);
	}
};
