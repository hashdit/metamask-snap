import {
	heading,
	panel,
	text,
	copyable,
	divider,
	address,
	row,
	Signature,
	Component,
} from '@metamask/snaps-sdk';

export async function verifyContractAndFunction(
	transaction: any,
	chainNumber: string,
	apiKey: any,
): Promise<Component[]> {
	const resultArray: Component[] = [];

	console.log('verifyContractAndFunction()', transaction, chainNumber, apiKey);

	if (chainNumber == '56' || chainNumber == '1') {
		const isDestinationVerifiedResult = await isDestinationVerified(
			transaction.to,
			chainNumber,
			apiKey,
		);
		// If contract is unverified, return unverified risk
		if (isDestinationVerifiedResult == 'unverified') {
			resultArray.push(
				heading('Unverified Contract'),
				row('Contract', address(transaction.to)),
				row('Risk Level', text('⛔ High ⛔')),
				text(
					'🚨 WARNING: This contract is unverified and could steal your funds! The code is hidden and may be designed to scam you. REJECT this transaction immediately to protect your assets.',
				),
				divider(),
			);

			return resultArray;
		}
		if(isDestinationVerifiedResult == 'EOA'){
			return resultArray;
		}
	}
	// If isDestinationVerifiedResult returns null, or if chain not supported, continue.
	// Validate transaction data and extract function selector
	if (!transaction.data || typeof transaction.data !== 'string' || transaction.data.length < 10) {
		console.log('No valid transaction data found - skipping function validation');
		return resultArray;
	}

	const functionSelector = transaction.data.slice(0, 10);
	
	// Check if it's not just zeros (which might indicate no function call)
	if (functionSelector === '0x00000000') {
		console.log('Function selector is all zeros - skipping function validation');
		return resultArray;
	}

	const is4ByteDatabaseVerified = await check4ByteDatabase(functionSelector);

	if (!is4ByteDatabaseVerified) {
		resultArray.push(
			heading('Unverified Function'),
			row('Function Signature', text(functionSelector)),
			row('Risk Level', text('⚠️ Medium ⚠️')),
			text(
				"This function is uncommon and potentially risky. Verify the contract before proceeding.",
			),
			divider(),
		);
		return resultArray;
	}

	// All checks passed - no security warnings needed
	return resultArray;
}

async function check4ByteDatabase(functionSelector: string): Promise<boolean> {
	// Check if the function signature is in the 4Byte database
	try {
		const response = await fetch(
			`https://www.4byte.directory/api/v1/signatures/?hex_signature=${functionSelector}`,
		);

		if (response.ok) {
			const data = await response.json();
			// Return true if signature is found (known function)
			// Return false if signature is not found (unknown function)
			return data.count > 0;
		} else {
			console.error('Error querying 4byte API:', response.status);
			// On API error, assume function is known (safer default)
			return true;
		}
	} catch (error) {
		console.error('Fetch error:', error);
		// On network error, assume function is known (safer default)
		return true;
	}
}

async function isDestinationVerified(
	contractAddress: any,
	chainNumber: any,
	apiKey: any,
) {
	// Input validation
	if (!contractAddress || !chainNumber || !apiKey) {
		console.error('Missing required parameter for contract verification');
		return true;
	}

	const requestBody = {
		chainId: chainNumber,
		address: contractAddress,
	};

	try {
		const response = await fetch(
			'https://service.hashdit.io/v2/hashdit/address-classify',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-KEY': apiKey,
				},
				body: JSON.stringify(requestBody),
			},
		);

		if (!response.ok) {
			console.error(
				`API Error: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const resp = await response.json();

		// Validate response structure
		if (resp.status !== 'ok' || !resp.data || !resp.data.details) {
			console.error('Invalid API response structure');
			return null;
		}

		console.log('address-classify', JSON.stringify(resp, null, 2));
		// Only check verification status if it's a contract
		if (resp.data.address_type === 'Contract') {
			if(resp.data.details.is_verified == true) {
				return 'verified';
			}
			else {
				return 'unverified';
			}
		}

		// For non-contract addresses, return true
		return "EOA";
	} catch (error) {
		console.error('Fetch error:', error);
		return null;
	}
}
