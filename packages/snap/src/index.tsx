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
import { TransactionInsight } from './features/TransactionInsight';
import {
	Box,
	Heading,
	Text,
	Bold,
	Divider,
	Banner,
	Link,
	Container,
	Footer,
	Button,
	Row,
	Address,
	Section,
	Value,
} from '@metamask/snaps-sdk/jsx';

// Called during after installation. Show install instructions and links
export const onInstall: OnInstallHandler = async () => {
	// console.log('onInstall');
	// return {
	// 	content: onInstallContent
	// };
	await runInstaller();
};

// Called during a signature request transaction. Show insights
export const onSignature: OnSignatureHandler = async ({
	signature,
	signatureOrigin,
}) => {
	// console.log('onSignature', signature, signatureOrigin);
	// try {
	// 	const persistedUserData = await snap.request({
	// 		method: 'snap_manageState',
	// 		params: { operation: 'get' },
	// 	});
	// 	// If no persisted data, return error content immediately
	// 	if (persistedUserData === null) {
	// 		return { content: errorContent };
	// 	}
	// 	let contentArray: any[] = [];
	// 	const signatureContent = await parseSignature(
	// 		signature,
	// 		persistedUserData.DiTingApiKey,
	// 	);
	// 	const domainSecurityContent = await callDomainSecurity(
	// 		signatureOrigin,
	// 		persistedUserData.DiTingApiKey,
	// 	);
	// 	// Merge the signature parsing results if they exist
	// 	if (signatureContent != null && Array.isArray(signatureContent)) {
	// 		contentArray.push(...signatureContent);
	// 	}
	// 	// Merge the Domain Security content if it exists
	// 	if (domainSecurityContent != null && Array.isArray(domainSecurityContent)) {
	// 		contentArray.push(...domainSecurityContent);
	// 	}
	// 	// Return content if we have any, otherwise return error content
	// 	return {
	// 		content: contentArray.length > 0 ? panel(contentArray) : errorContent
	// 	};
	// } catch (error) {
	// 	console.error('Error retrieving persisted user data:', error);
	// 	return { content: errorContent };
	// }
};

// Called when a transaction is pending. Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({
	transaction,
	chainId,
	transactionOrigin,
}) => {
	try {
		const chainNumber = chainId.split(':')[1];

		const persistedUserData = await snap.request({
			method: 'snap_manageState',
			params: { operation: 'get' },
		});
		if (persistedUserData !== null) {
			const apiKey = persistedUserData.DiTingApiKey;

			// Only support Ethereum and BSC Mainnet
			if (chainNumber == '1' || chainNumber == '56') {
				// Run all API calls concurrently
				const [
					domainSecurityContent,
					transactionInsightContent,
					transactionSimulationContent,
				] = await Promise.all([
					callDomainSecurity(transactionOrigin, apiKey),
					TransactionInsight(
						transaction,
						transactionOrigin,
						chainNumber,
						apiKey,
					),
					callTransactionSimulation(
						apiKey,
						chainNumber,
						transaction.to,
						transaction.from,
						transaction.gas,
						transaction.value,
						transaction.data,
					),
				]);
				console.log(
					'transactionInsightContent',
					transactionInsightContent,
				);
				console.log('transactionSimulationContent', transactionSimulationContent);
				return {
					content: (
						<Box>
							{domainSecurityContent}
							{transactionInsightContent}
							{transactionSimulationContent}
						</Box>
					),
				};
			} else {
				return {
					content: notSupportedChainContent,
				};
			}
		}
	} catch (error) {
		console.error('Error in onTransaction:', error);
		return {
			content: errorContent,
		};
	}
};

export const onHomePage: OnHomePageHandler = async () => {
	return {
		content: panel(onHomePageContent),
	};
};
