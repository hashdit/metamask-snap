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
import { Box, Heading, Text, Bold, Divider } from "@metamask/snaps-sdk/jsx";


const test = (
	<Box>
		<Heading>🚀 HashDit Security Snap - Installation Complete!</Heading>
		
		<Text>
			<Bold>Welcome to enhanced Web3 security!</Bold> Your snap is now ready to protect you from malicious transactions, phishing attempts, and security threats.
		</Text>

		<Divider />

		<Heading>⚡ Quick Setup (2 minutes)</Heading>
		
		<Text><Bold>1. Connect Your Accounts</Bold></Text>
		<Text>
			Connect all your MetaMask accounts to enable comprehensive protection across your entire wallet.
		</Text>
		
		<Text><Bold>2. Complete Authentication</Bold></Text>
		<Text>
			Sign the security message to activate real-time threat detection and analysis features.
		</Text>

		<Divider />

		<Heading>🛡️ What You're Protected Against</Heading>
		
		<Text>✅ <Bold>Transaction Analysis</Bold> - Smart contract security verification</Text>
		<Text>✅ <Bold>Address Poisoning</Bold> - Detection of malicious address patterns</Text>
		<Text>✅ <Bold>Signature Insights</Bold> - Understanding what you're signing</Text>
		<Text>✅ <Bold>Blacklist Checking</Bold> - Known malicious addresses and URLs</Text>
		<Text>✅ <Bold>Unverified Contracts</Bold> - Warnings for risky smart contracts</Text>

		<Divider />

		<Heading>📚 Resources & Support</Heading>
		
		<Text>
			📖 <Bold>Getting Started</Bold>: [Quick Guide](https://hashdit.gitbook.io/hashdit-snap/usage/how-to-use-hashdit-snap)
		</Text>
		<Text>
			🌐 <Bold>Official Website</Bold>: [HashDit.io](https://www.hashdit.io/en/snap)
		</Text>
		<Text>
			❓ <Bold>Need Help?</Bold>: [FAQ & Support](https://hashdit.gitbook.io/hashdit-snap/information/faq-and-knowledge-base)
		</Text>
		<Text>
			📝 <Bold>Feedback</Bold>: [1-Minute Survey](https://forms.gle/fgjAgVjUSyjuDS5BA)
		</Text>

		<Divider />

		<Heading>🎉 You're All Set!</Heading>
		<Text>
			HashDit Snap will now automatically analyze your transactions and warn you of potential security risks. Stay safe in Web3!
		</Text>
	</Box>
);
// Called during after installation. Show install instructions and links
export const onInstall: OnInstallHandler = async () => {
	//await runInstaller();
	console.log('onInstall');
	// return {
	// 	content: (
	// 	  <Box>
	// 		<Heading>Features</Heading>
	// 		<Box
	// 		  direction="horizontal"
	// 		  alignment="space-around"
			 
	// 		>
	// 		  <Text>Feature 1</Text>
	// 		  <Text>Feature 2</Text>
	// 		  <Text>Feature 3</Text>
	// 		</Box>
	// 	  </Box>
	// 	),
	//   };
	await snap.request({
		method: 'snap_dialog',
		params: {
			type: 'alert',
			content: (
					  <Box>
						<Heading>Features</Heading>
						<Box
						  direction="horizontal"
						  alignment="space-around"
						 
						>
						  <Text>Feature 1</Text>
						  <Text>Feature 2</Text>
						  <Text>Feature 3</Text>
						</Box>
					  </Box>
					) 
		},
	});

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
