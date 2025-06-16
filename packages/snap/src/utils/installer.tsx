import { onInstallContent } from './content';
import { extractPublicKeyFromSignature } from './cryptography';
import { Box, Heading, Text, Bold, Divider, Banner } from '@metamask/snaps-sdk/jsx';

export const runInstaller = async () => {
	await snap.request({
		method: 'snap_dialog',
		params: {
			type: 'alert',
			content: onInstallContent,
		},
	});
	try {
		// Get user's accounts
		const accounts = await ethereum.request({
			method: 'eth_requestAccounts',
		});
		const from = accounts[0];

		// Request user to sign a message -> get user's signature -> get user's public key.
		const message = `Hashdit Security: ${from}, Please sign this message to authenticate the HashDit API.`;
		let signature;
		try {
			signature = (await ethereum.request({
				method: 'personal_sign',
				params: [message, from],
			})) as string;
		} catch (error) {
			console.error('Error signing message:', error);
			return; // Exit if there's an error
		}

		let publicKey = extractPublicKeyFromSignature(message, signature, from)?.substring(2);
		const newState: any = {
			publicKey: publicKey,
			userAddress: from,
			messageSignature: signature,
		};

		// Call DiTing Auth API to retrieve personal API key
		try {
			const DiTingResult = await authenticateHashDitV2(from, signature);
			if (DiTingResult.message === 'ok' && DiTingResult.apiKey != '') {
				newState.DiTingApiKey = DiTingResult.apiKey;
				//console.log('DitingResult', DiTingResult);
			} else {
				throw new Error(`Authentication failed: ${DiTingResult.message}`);
			}
		} catch (error) {
			console.error('An error occurred during DiTing authentication:', error);
		}

		// Finally, update the state with all the collected data
		try {
			await snap.request({
				method: 'snap_manageState',
				params: {
					operation: 'update',
					newState: newState,
				},
			});
		} catch (error) {
			console.error('An error occurred during saving to local storage:', error);
		}
	} catch (error) {
		console.error('Error during HashDit Snap installation:', error);
	}
};

// Called during HashDit Snap installation. Used to authenticate the user with DiTing, and retrieve an API key.
async function authenticateHashDitV2(userAddress: string, signature: string) {
	const requestBody = {
		userAddr: userAddress,
		signature: signature,
	};

	const response = await fetch('https://service.hashdit.io/v2/auth', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	});
	const resp = await response.json();

	return resp;
}
