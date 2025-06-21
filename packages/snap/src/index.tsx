/* eslint-disable */
import type { OnTransactionHandler, OnInstallHandler, OnHomePageHandler, OnSignatureHandler } from '@metamask/snaps-sdk';

import { onInstallContent, onHomePageContent, errorContent, notSupportedChainContent } from './utils/content';
import { runInstaller } from './utils/installer';
import { callDomainSecurity } from './features/DomainCheck';
import { callTransactionSimulation } from './features/SimulationCheck';

import { callTransactionInsight } from './features/TransactionInsight';
import { parseSignature } from './features/SignatureCheck';
import { Box, Heading, Text, Bold, Divider, Banner, Link, Container, Footer, Button, Row, Address, Section, Value } from '@metamask/snaps-sdk/jsx';
import { riskLevelToBannerValues } from './utils/utilFunctions';
import { chainIdHexToNumber } from './utils/utilFunctions';
import { addressPoisoningDetection } from './features/AddressPoisoning';

// Called during after installation. Show install instructions and links
export const onInstall: OnInstallHandler = async () => {
	await runInstaller();
};

// Called during a signature request transaction. Show insights
export const onSignature: OnSignatureHandler = async ({ signature, signatureOrigin }) => {
	//console.log('onSignature', JSON.stringify(signature), signatureOrigin);
	let signatureContent = null;
	let signatureRiskScore = 0;
	try {
		const persistedUserData = await snap.request({
			method: 'snap_manageState',
			params: { operation: 'get' },
		});
		// If no persisted data, return error content immediately
		if (persistedUserData === null) {
			console.error('Error retrieving persisted user data');
			return null;
		}

		const chainId = await ethereum.request({ method: 'eth_chainId' });
		const chainNumber = chainIdHexToNumber(chainId as string);

		// Only support Ethereum and BSC Mainnet for Signature Check
		if (chainNumber) {
			if (chainNumber.toString() === '1' || chainNumber.toString() === '56') {
				[signatureContent, signatureRiskScore] = await parseSignature(signature, persistedUserData.DiTingApiKey, chainNumber.toString());
			}
		}

		const [domainSecurityContent, domainRiskScore] = await callDomainSecurity(signatureOrigin, persistedUserData.DiTingApiKey);

		const maxRiskLevel = Math.max(signatureRiskScore, domainRiskScore);
		const [severity, title, description] = riskLevelToBannerValues(maxRiskLevel);

		// Create array of content with their risk scores for sorting
		const contentWithScores = [
			{ content: domainSecurityContent, score: domainRiskScore },
			{ content: signatureContent, score: signatureRiskScore },
		].filter((item) => item.content !== null); // Filter out null content

		// Sort by risk score in descending order
		const sortedContent = contentWithScores.sort((a, b) => b.score - a.score).map((item) => item.content);


		return {
			content: (
				<Box>
					<Banner title={title} severity={severity}>
						<Text>{description}</Text>
					</Banner>
					{sortedContent}
				</Box>
			),
		};
	} catch (error) {
		console.error('OnSignature Error', error);
		return { content: errorContent };
	}
};

// Called when a transaction is pending. Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId, transactionOrigin }) => {
	try {
		const chainNumber = chainId.split(':')[1];

		//console.log('transaction', transaction);

		const persistedUserData = await snap.request({
			method: 'snap_manageState',
			params: { operation: 'get' },
		});
		if (persistedUserData !== null) {
			const apiKey = persistedUserData.DiTingApiKey;

			// Only support all checks on the Ethereum and BSC Mainnet
			if (chainNumber == '1' || chainNumber == '56') {
				// Run all API calls concurrently
				const [
					[domainSecurityContent, domainRiskScore],
					[transactionInsightContent, insightRiskScore],
					[addressPoisoningContent, addressPoisoningRiskScore, transactionSimulationContent, simulationRiskScore],
				] = await Promise.all([
					callDomainSecurity(transactionOrigin, apiKey),
					callTransactionInsight(transaction, transactionOrigin, chainNumber, apiKey),
					callTransactionSimulation(apiKey, chainNumber, transaction.to, transaction.from, transaction.gas, transaction.value, transaction.data),
				]);

				const maxRiskLevel = Math.max(domainRiskScore, insightRiskScore, Number(addressPoisoningRiskScore), Number(simulationRiskScore));
				const [severity, title, description] = riskLevelToBannerValues(maxRiskLevel);

				// Create array of content with their risk scores for sorting
				const contentWithScores = [
					{ content: domainSecurityContent, score: domainRiskScore },
					{ content: transactionInsightContent, score: insightRiskScore },
					{ content: addressPoisoningContent, score: addressPoisoningRiskScore },
				].filter((item) => item.content !== null); // Filter out null content

				// Sort by risk score in descending order
				const sortedContent = contentWithScores.sort((a, b) => b.score - a.score).map((item) => item.content);

				// Transaction Simulation Content will always be the last content
				// The other content will be sorted by risk score in descending order
				return {
					content: (
						<Box>
							<Banner title={title} severity={severity}>
								<Text>{description}</Text>
							</Banner>
							{sortedContent}
							{transactionSimulationContent}
						</Box>
					),
				};
			} else {
				// If the chain is not supported, only check and show the domain security content and address poisoning content
				const [domainSecurityContent, domainRiskScore] = await callDomainSecurity(transactionOrigin, apiKey);
				// Get the user's connected accounts
				const accounts = (await ethereum.request({
					method: 'eth_accounts',
				})) as string[];

				const [addressPoisoningContent, addressPoisoningRiskScore] = addressPoisoningDetection(accounts, [transaction.to]);
				const maxRiskLevel = Math.max(domainRiskScore, Number(addressPoisoningRiskScore));
				const [severity, title, description] = riskLevelToBannerValues(maxRiskLevel);

				// Create array of content with their risk scores for sorting
				const contentWithScores = [
					{ content: domainSecurityContent, score: domainRiskScore },
					{ content: addressPoisoningContent, score: addressPoisoningRiskScore },
				].filter((item) => item.content !== null); // Filter out null content

				// Sort by risk score in descending order
				const sortedContent = contentWithScores.sort((a, b) => b.score - a.score).map((item) => item.content);

				return {
					content: (
						<Box>
							<Banner title={title} severity={severity}>
								<Text>{description}</Text>
							</Banner>
							{sortedContent}
							{notSupportedChainContent}
						</Box>
					),
				};
			}
		} else {
			console.error('Error in onTransaction. Could not retrieve user persisted key');
			return {
				content: errorContent,
			};
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
		content: <Box>{onHomePageContent}</Box>,
	};
};
