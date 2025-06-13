/* eslint-disable */
import type {
	OnTransactionHandler,
	OnInstallHandler,
	OnHomePageHandler,
	OnSignatureHandler,
} from '@metamask/snaps-sdk';

import {
	heading,
	panel,
	text,
	divider,
	address,
	row,
} from '@metamask/snaps-sdk';

import {
	isEOA,
	determineTransactionAndDestinationRiskInfo,
} from './features/utils';
import { parseSignature } from './features/signatureInsight';
import { addressPoisoningDetection } from './features/AddressPoisoning';
import { verifyContractAndFunction } from './features/unverifiedCheck';

import { callDiTingTxSimulation } from './features/SimulationUtils';
import { extractPublicKeyFromSignature } from './features/cryptography';
import {
	onInstallContent,
	onHomePageContent,
	errorContent,
	notSupportedChainContent,
} from './features/content';
import { runInstaller } from './installer';
import { callDomainSecurity } from './features/blacklistCheck';
import { callTransactionSimulation } from './features/SimulationCheck';
import { callHashDitAddressSecurityV2 } from './features/AddressCheck';
import {TransactionInsight} from './features/TransactionInsight';


// Called during after installation. Show install instructions and links
export const onInstall: OnInstallHandler = async () => {
	await runInstaller();
};

// Called during a signature request transaction. Show insights
export const onSignature: OnSignatureHandler = async ({
	signature,
	signatureOrigin,
}) => {
	//console.log('onSignature', signature, signatureOrigin);
	try {
		const persistedUserData = await snap.request({
			method: 'snap_manageState',
			params: { operation: 'get' },
		});

		if (persistedUserData !== null) {
	
			let contentArray: any[] = [];

			const signatureContent = await parseSignature(
				signature,
				persistedUserData.DiTingApiKey,
			);

			const domainSecurityContent = await callDomainSecurity(
				signatureOrigin,
				persistedUserData.DiTingApiKey,
			);

			// Merge the signature parsing results if they exist
			if (signatureContent != null && Array.isArray(signatureContent)) {
				//console.log(signatureContent, 'signatureContent');
				contentArray.push(...signatureContent);
			}

			// Merge the Domain Security content if it exists
			if (
				domainSecurityContent != null &&
				Array.isArray(domainSecurityContent)
			) {
				//console.log(domainSecurityContent, 'domainSecurityContent');
				contentArray.push(...domainSecurityContent);
			}

			if (contentArray.length > 0) {
				const content = panel(contentArray);
		
				return { content };
			}
		}
		// Fallback error message if none of the above conditions were met
		return { content: panel(errorContent) };
	} catch (error) {
		console.error('Error retrieving persisted user data:', error);
		return { content: panel(errorContent) };
	}
};

// Called when a transaction is pending. Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({
	transaction,
	chainId,
	transactionOrigin,
}) => {
	// Better debugging methods for transaction object
	console.log(
		'Transaction Details (JSON):',
		JSON.stringify(transaction, null, 2),
	);
	// Extract chain number from EIP-155 format (e.g., "eip155:1" -> "1")
	const chainNumber = chainId.includes(':') ? chainId.split(':')[1] : chainId;
	console.log('Chain :', chainNumber);
	console.log('Transaction Origin:', transactionOrigin);





	const persistedUserData = await snap.request({
		method: 'snap_manageState',
		params: { operation: 'get' },
	});
	if (persistedUserData !== null) {


		const apiKey = persistedUserData.DiTingApiKey;

		let contentArray: any[] = [];


		// Only support Ethereum and BSC Mainnet
		if(chainNumber == '1' || chainNumber == '56'){
			// Run all API calls concurrently
			const [domainSecurityContent, transactionInsightContent, callTransactionSimulationContent] = await Promise.all([
				callDomainSecurity(transactionOrigin, apiKey),
				TransactionInsight(transaction, transactionOrigin, chainNumber, apiKey),
				callTransactionSimulation(
					apiKey,
					chainNumber,
					transaction.to,
					transaction.from,
					transaction.gas,
					transaction.value,
					transaction.data,
				)
			]);

			// Add domain security content if it exists
			if (domainSecurityContent != null && Array.isArray(domainSecurityContent)) {
				contentArray.push(...domainSecurityContent);
			}
			
			// Add transaction insight content if it exists
			if (transactionInsightContent != null && Array.isArray(transactionInsightContent)) {
				contentArray.push(...transactionInsightContent);
			}

			// Add simulation content if it exists
			if (callTransactionSimulationContent != null && Array.isArray(callTransactionSimulationContent)) {
				contentArray.push(...callTransactionSimulationContent);
			}
		}
		else{
			contentArray.push(
				heading('Unsupported Network'),
				text('This snap only supports Ethereum and BSC Mainnet'),
			);
		}

		return { content: panel(contentArray) };
	}

};

export const onHomePage: OnHomePageHandler = async () => {
	return {
		content: panel(onHomePageContent),
	};
};
