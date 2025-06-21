/* eslint-disable */
import { ethers } from 'ethers';
import { ec as EC } from 'elliptic';

export const extractPublicKeyFromSignature = (message: any, signature: any, from: any) => {
	try {
		// Ensure the message is equal to the expected message, otherwise any arbitrary message + signature can be used.
		const expectedMessage = `Hashdit Security: ${from}, Please sign this message to authenticate the HashDit API.`;
		if (message !== expectedMessage) {
			throw new Error(`Invalid message. Expected: "${expectedMessage}", Received: "${message}"`);
		}
		const secp256k1 = new EC('secp256k1');
		const hash = ethers.hashMessage(message);
		const vals = decodeSignature(signature);
		const vrs = {
			v: toNumber(vals[0]),
			r: vals[1].slice(2),
			s: vals[2].slice(2),
		};
		const ecPublicKey = secp256k1.recoverPubKey(new Buffer(hash.slice(2), 'hex'), vrs, vrs.v < 2 ? vrs.v : 1 - (vrs.v % 2));
		const publicKey = '0x' + ecPublicKey.encode('hex', false).slice(2);

		return publicKey;
	} catch (error) {
		//console.error('Error extracting public key:', error);
	}
};

const length = (a) => (a.length - 2) / 2;

const slice = (i, j, bs) => '0x' + bs.slice(i * 2 + 2, j * 2 + 2);

const decodeSignature = (hex) => [slice(64, length(hex), hex), slice(0, 32, hex), slice(32, 64, hex)];

const toNumber = (hex) => parseInt(hex.slice(2), 16);
