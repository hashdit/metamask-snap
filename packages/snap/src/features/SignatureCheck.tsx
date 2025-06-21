/* eslint-disable */
import { Box, Heading, Text, Bold, Divider, Banner, Link, Container, Footer, Button, Row, Address, Section, Value } from '@metamask/snaps-sdk/jsx';
import { Signature } from '@metamask/snaps-sdk';
import { errorContent } from '../utils/content';

import { getRiskLevelText, getRiskLevelColor, getRiskLevelVariant } from '../utils/utilFunctions';
import { isDestinationVerified } from './UnverifiedCheck';

// Expected structure for EIP712 signature
export interface SignatureParsed {
	from: string;
	data: {
		types: {
			EIP712Domain: Array<{ name: string; type: string }>;
			PermitBatch?: Array<{ name: string; type: string }>;
			PermitDetails?: Array<{ name: string; type: string }>;
			PermitSingle?: Array<{ name: string; type: string }>;
			PermitForAll?: Array<{ name: string; type: string }>;
			Permit?: Array<{ name: string; type: string }>;
		};
		domain: {
			name: string;
			chainId: string;
			verifyingContract: string;
		};
		primaryType: string;
		message: any;
	};
}

// Determine if the signature is a Permit signature.
export async function parseSignature(signature: Signature, apiKey: any, chainNumber: string) {
	// We consider personal_sign to have no obvious risk
	if (signature.signatureMethod == 'personal_sign') {
		return [
			<Box>
				<Heading>Signature Screen</Heading>
				<Section>
					<Row label="Risk Level" variant="default">
						<Value value="🟢 No Obvious Risk" extra="" />
					</Row>
					<Text color="muted">
						This signature is trying to confirm you own this address. It's a common way to verify your identity without sharing your private key. This process generally does not pose any
						significant risk.
					</Text>
				</Section>
			</Box>,
			0,
		];
	}

	let signatureParsed: SignatureParsed;
	let decodedData;

	// Check if signature.data is an object. Exit if data is not an object
	if (typeof signature.data !== 'object') {
		//console.log('Invalid data type for signature.data:', typeof signature.data);
		return [null, 0];
	}

	decodedData = signature.data;

	signatureParsed = {
		from: signature.from,
		data: decodedData,
	};

	const { primaryType, message } = signatureParsed.data;

	let spender: string | undefined;
	// let token: any;
	// let amount: string | undefined;

	// Check for PermitBatch
	if (primaryType === 'PermitBatch' && message.details && Array.isArray(message.details)) {
		spender = message.spender;
	}
	// Check for PermitSingle
	else if (primaryType === 'PermitSingle' && message.details) {
		spender = message.spender;
	}
	// Check for PermitForAll
	else if (primaryType === 'PermitForAll') {
		spender = message.operator;
	}
	// Check for Permit (ERC20/other token)
	else if (primaryType === 'Permit' && message.spender) {
		spender = message.spender;
	} else {
		//console.log('Not a Permit Signature, returning null');

		return [null, 0];
	}
	return await callHashDitAPIForSignatureInsight(primaryType, spender, apiKey, chainNumber);
}

// Call the HashDit API to retrieve risk levels
async function callHashDitAPIForSignatureInsight(primaryType: any, spender: any, apiKey: any, chainNumber: string) {
	let addressSecurityContent = null;

	const permitTypes = ['Permit', 'PermitSingle', 'PermitForAll', 'PermitBatch'];

	if (permitTypes.includes(primaryType)) {
		addressSecurityContent = await callSignatureBlacklist(chainNumber, spender, apiKey);
	}

	return addressSecurityContent;
}

export async function callSignatureBlacklist(chainNumber: string, spenderAddress: string, apiKey: any) {
	const requestBody = [
		{
			chain_id: chainNumber,
			address: spenderAddress,
		},
	];

	try {
		const response = await fetch('https://service.hashdit.io/v2/hashdit/batch-address-security', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': apiKey,
			},
			body: JSON.stringify(requestBody),
		});
		// Check for HTTP errors
		if (!response.ok) {
			console.error(`HTTP error! Status: ${response.status}`);
			return [null, 0];
		}

		const resp = await response.json();
		//console.log('callAddressSecurity_sig response:', JSON.stringify(resp, null, 2));

		// Check if the response has `code: 0` and `status: "ok"`
		if (resp.code === '0' && resp.status === 'ok') {
			//console.log('Response is valid');
			return await parseResponse(resp, spenderAddress, chainNumber, apiKey);
		} else {
			console.error('Unexpected response:', resp);
			return [null, 0];
		}
	} catch (error) {
		console.error(`Error when checking address: ${spenderAddress} on chain ${chainNumber}:`, error);
		return [null, 0];
	}
}

async function parseResponse(resp: any, spenderAddress: string, chainNumber: string, apiKey: any) {
	// If no response or no data array, show 'Unknown' risk level
	if (!resp || !resp.data || !Array.isArray(resp.data) || resp.data.length === 0) {
		return [null, 0];
	}

	let risk_level: number = 3; // Default to 3, as any approval has minimum "Medium" risk.
	// Get the first item from the data array
	const dataItem = resp.data[0];
	if (dataItem.risk_level !== undefined && dataItem.risk_level !== null) {
		risk_level = Math.max(Number(dataItem.risk_level), 3);
	}

	// Check if spender is an EOA, Unverified, or Verified
	const spenderAddressType = await isDestinationVerified(spenderAddress, chainNumber, apiKey);
	//console.log('spenderAddressType', spenderAddressType);
	return createContentForSignatureInsight(risk_level, spenderAddress, spenderAddressType);
}

async function createContentForSignatureInsight(risk_level: number, spenderAddress: string, spenderAddressType: any) {
	if (spenderAddressType == 'unverified') {
		return [
			<Box>
				<Heading>Signature Screen</Heading>
				<Section>
					<Heading>Token Approval To Unverified Contract</Heading>
					<Row label="Risk Level" variant="critical">
						<Value value="🔴 High" extra="" />
					</Row>
					<Row label="Spender">
						<Address address={spenderAddress as `0x${string}`} />
					</Row>
					<Text color="muted">You are using 'approve' for tokens to an unverified contract. This is risky as you cannot inspect the code to understand how your tokens might be used.</Text>
				</Section>
			</Box>,
			4,
		];
	}
	if (spenderAddressType == 'EOA') {
		return [
			<Box>
				<Heading>Signature Screen</Heading>
				<Section>
					<Heading>Token Approval To EOA Address</Heading>
					<Row label="Risk Level" variant="critical">
						<Value value="🔴 High" extra="" />
					</Row>
					<Row label="Spender">
						<Address address={spenderAddress as `0x${string}`} />
					</Row>
					<Text color="muted">
						You are using 'approve' for tokens to a personal wallet (EOA) rather than a contract. This is unusual and potentially risky as EOAs are controlled by individuals.
					</Text>
				</Section>
			</Box>,
			4,
		];
	} else {
		const riskLevelText = getRiskLevelText(risk_level);
		const riskLevelColor = getRiskLevelColor(risk_level);
		const riskLevelVariant = getRiskLevelVariant(risk_level);

		return [
			<Box>
				<Heading>Signature Screen</Heading>
				<Section>
					<Heading>Token Approval To Verified Contract</Heading>
					<Row label="Risk Level" variant={riskLevelVariant}>
						<Value value={`${riskLevelColor} ${riskLevelText}`} extra="" />
					</Row>
					<Row label="Spender">
						<Address address={spenderAddress as `0x${string}`} />
					</Row>
					<Text color="muted">
						You are using 'approve' to give unlimited approval to spend your tokens. This creates unnecessary risk as the approved address will maintain this access indefinitely. Consider
						approving only the amount needed for your immediate transaction.
					</Text>
				</Section>
			</Box>,
			risk_level,
		];
	}
}
