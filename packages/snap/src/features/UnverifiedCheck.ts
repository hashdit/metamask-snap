export async function isDestinationVerified(contractAddress: any, chainNumber: any, apiKey: any) {
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
		const response = await fetch('https://service.hashdit.io/v2/hashdit/address-classify', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-KEY': apiKey,
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			console.error(`API Error: ${response.status} ${response.statusText}`);
			return null;
		}

		const resp = await response.json();

		// Validate response structure
		if (resp.status !== 'ok' || !resp.data || !resp.data.details) {
			console.error('Invalid API response structure');
			return null;
		}

		//console.log('address-classify', JSON.stringify(resp, null, 2));
		// Only check verification status if it's a contract
		if (resp.data.address_type === 'Contract') {
			if (resp.data.details.is_verified === true) {
				return 'verified';
			} else {
				return 'unverified';
			}
		}

		// For non-contract addresses, return true
		return 'EOA';
	} catch (error) {
		console.error('Fetch error:', error);
		return null;
	}
}
