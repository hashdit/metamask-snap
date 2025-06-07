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
import {
	getHashDitResponse,
	authenticateHashDit,
	authenticateHashDitV2,
} from './features/api';
import { parseSignature } from './features/signatureInsight';
import { addressPoisoningDetection } from './features/AddressPoisoning';
import { verifyContractAndFunction } from './features/unverifiedCheck';
import {
	callHashDitAddressSecurityV2,
	createContentForAddressSecurityV2,
} from './features/api';
import { callDiTingTxSimulation } from './features/SimulationUtils';
import { extractPublicKeyFromSignature } from './features/cryptography';
import {
	onInstallContent,
	onHomePageContent,
	errorContent,
} from './features/content';
import { runInstaller } from './installer';
import { callDomainSecurity } from './features/blacklistCheck';

// Called during after installation. Show install instructions and links
export const onInstall: OnInstallHandler = async () => {
	await runInstaller();
};

// Called during a signature request transaction. Show insights
export const onSignature: OnSignatureHandler = async ({
	signature,
	signatureOrigin,
}) => {
	let persistedUserData;
	// Retrieve persisted user data

	try {
		persistedUserData = await snap.request({
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
				console.log(signatureContent, 'signatureContent');
				contentArray.push(...signatureContent);
			}

			// Merge the Domain Security content if it exists
			if (
				domainSecurityContent != null &&
				Array.isArray(domainSecurityContent)
			) {
				console.log(domainSecurityContent, 'domainSecurityContent');
				contentArray.push(...domainSecurityContent);
			}

			if (contentArray.length > 0) {
				const content = panel(contentArray);
				console.log(contentArray, 'final content array');
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
	transactionOrigin,
}) => {
	//console.log('Transaction:', JSON.stringify(transaction, null, 2));

	const accounts = await ethereum.request({
		method: 'eth_accounts',
		params: [],
	});
	// Transaction is a native token transfer if no contract bytecode found.
	if (await isEOA(transaction.to)) {
		const chainId = await ethereum.request({ method: 'eth_chainId' });
		// Check if chainId is undefined or null
		if (typeof chainId !== 'string') {
			const contentArray: any[] = [
				heading('HashDit Security Insights'),
				text(`Error: ChainId could not be retrieved (${chainId})`),
			];
			const content = panel(contentArray);
			return { content };
		}
		// Current chain is not supported (not BSC or ETH). Native Token Transfer.
		if (chainId !== '0x38' && chainId !== '0x1') {
			// Retrieve saved user's public key to make HashDit API call
			const persistedUserData = await snap.request({
				method: 'snap_manageState',
				params: { operation: 'get' },
			});

			let contentArray: any[] = [];
			var urlRespData;
			if (persistedUserData !== null) {
				const poisonResultArray = addressPoisoningDetection(accounts, [
					transaction.to,
				]);
				if (poisonResultArray.length != 0) {
					contentArray = poisonResultArray;
				}

				// Website Screening call
				urlRespData = await getHashDitResponse(
					'hashdit_snap_tx_api_url_detection',
					persistedUserData,
					transactionOrigin,
				);
				contentArray.push(
					heading('Website Screening'),
					row('Website', text(transactionOrigin)),
					row('Risk Level', text(urlRespData.url_risk_level)),
					text(urlRespData.url_risk_detail),
					divider(),
				);
			} else {
				contentArray.push(
					heading('HashDit Security Insights'),
					text(
						'⚠️ The full functionality of HashDit is not working. ⚠️',
					),
					text('To resolve this issue, please follow these steps:'),
					divider(),
					text(
						"**(1)** _Click on the 'Reconnect' or 'Install' button on the HashDit website to install the Snap._",
					),
					text(
						'**(2)** _Install the snap by approving the required permissions._',
					),
					text(
						'**(3)** _Confirm your identity by signing the provided message._',
					),
					divider(),
				);
			}

			contentArray.push(
				text(
					'HashDit Security Insights is not fully supported on this chain.',
				),
				text(
					'Currently we only support the **BSC Mainnet** and **ETH Mainnet**.',
				),
			);

			const content = panel(contentArray);
			return { content };
		}
		// Current chain is supported (BSC or ETH). Native Token Transfer.
		else {
			// Retrieve saved user's public key to make HashDit API call
			const persistedUserData = await snap.request({
				method: 'snap_manageState',
				params: { operation: 'get' },
			});

			let contentArray: any[] = [];
			var urlRespData;
			if (persistedUserData !== null) {
				const poisonResultArray = addressPoisoningDetection(accounts, [
					transaction.to,
				]);
				if (poisonResultArray.length != 0) {
					contentArray = poisonResultArray;
				}

				// Parallelize Destination Screening call and Website Screening call
				const [addressSecurityResult, urlRespData] = await Promise.all([
					callHashDitAddressSecurityV2(
						chainId,
						transaction.to,
						persistedUserData.DiTingApiKey,
					),

					getHashDitResponse(
						'hashdit_snap_tx_api_url_detection',
						persistedUserData,
						transactionOrigin,
					),
				]);

				// ToDo: Re-add simulation code
				// const [respData, urlRespData, txSimulationContentArray] =
				// 	await Promise.all([
				// 		getHashDitResponse(
				// 			'internal_address_lables_tags',
				// 			persistedUserData,
				// 			transactionOrigin,
				// 			transaction,
				// 			chainId,
				// 		),
				// 		getHashDitResponse(
				// 			'hashdit_snap_tx_api_url_detection',
				// 			persistedUserData,
				// 			transactionOrigin,
				// 		),
				// 		callDiTingTxSimulation(
				// 			persistedUserData,
				// 			chainId,
				// 			transaction.to,
				// 			transaction.from,
				// 			transaction.gas,
				// 			transaction.value,
				// 			transaction.data ? transaction.data : '',
				// 		),
				// 	]);

				if (addressSecurityResult != null) {
					const addressSecurityArray =
						createContentForAddressSecurityV2(
							addressSecurityResult,
						);
					contentArray.push(...addressSecurityArray);
				}

				contentArray.push(
					heading('Website Screening'),
					row('Website', text(transactionOrigin)),
					row('Risk Level', text(urlRespData.url_risk_level)),
					text(urlRespData.url_risk_detail),
					divider(),
				);

				// console.log(
				// 	'txSimulationContentArray',
				// 	txSimulationContentArray,
				// );
				// if (txSimulationContentArray != undefined) {
				// 	contentArray.push(...txSimulationContentArray);
				// }
			} else {
				contentArray.push(
					heading('HashDit Security Insights'),
					text(
						'⚠️ The full functionality of HashDit is not working. ⚠️',
					),
					text('To resolve this issue, please follow these steps:'),
					divider(),
					text(
						"**(1)** _Click on the 'Reconnect' or 'Install' button on the HashDit website to install the Snap._",
					),
					text(
						'**(2)** _Install the snap by approving the required permissions._',
					),
					text(
						'**(3)** _Confirm your identity by signing the provided message._',
					),
					divider(),
				);
			}

			const content = panel(contentArray);
			return { content };
		}
	}

	// Transaction is an interaction with a smart contract because contract bytecode exists.
	const chainId = await ethereum.request({ method: 'eth_chainId' });
	// Check if chainId is undefined or null
	if (typeof chainId !== 'string') {
		const contentArray: any[] = [
			heading('HashDit Security Insights'),
			text(`Error: ChainId could not be retrieved (${chainId})`),
		];
		const content = panel(contentArray);
		return { content };
	}
	// Current chain is not supported (Not BSC and not ETH). Smart Contract Interaction.
	if (chainId !== '0x38' && chainId !== '0x1') {
		// Retrieve saved user's public key to make HashDit API call
		const persistedUserData = await snap.request({
			method: 'snap_manageState',
			params: { operation: 'get' },
		});

		let contentArray: any[] = [];
		if (persistedUserData !== null) {
			const poisonResultArray = addressPoisoningDetection(accounts, [
				transaction.to,
			]);
			if (poisonResultArray.length != 0) {
				contentArray = poisonResultArray;
			}
			const signatureCheckResultArray = await verifyContractAndFunction(
				transaction,
				chainId,
				persistedUserData.DiTingApiKey,
			);
			if (signatureCheckResultArray.length !== 0) {
				contentArray.push(...signatureCheckResultArray);
			}
			// Website Screening call
			const urlRespData = await getHashDitResponse(
				'hashdit_snap_tx_api_url_detection',
				persistedUserData,
				transactionOrigin,
			);
			contentArray = [
				heading('Website Screening'),
				row('Website', text(transactionOrigin)),
				row('Risk Level', text(urlRespData.url_risk_level)),
				text(urlRespData.url_risk_detail),
				divider(),
				text(
					'HashDit Security Insights is not fully supported on this chain.',
				),
				text(
					'Currently we only support the **BSC Mainnet** and **ETH Mainnet**.',
				),
			];
		} else {
			contentArray = [
				heading('HashDit Security Insights'),
				text('⚠️ The full functionality of HashDit is not working. ⚠️'),
				text('To resolve this issue, please follow these steps:'),
				divider(),
				text(
					"**(1)** _Click on the 'Reconnect' or 'Install' button on the HashDit website to install the Snap._",
				),
				text(
					'**(2)** _Install the snap by approving the required permissions._',
				),
				text(
					'**(3)** _Confirm your identity by signing the provided message._',
				),
				divider(),
				text(
					'HashDit Security Insights is not fully supported on this chain. Only Website Screening has been performed.',
				),
				text(
					'Currently we only support the **BSC Mainnet** and **ETH Mainnet**.',
				),
			];
		}
		const content = panel(contentArray);
		return { content };
	} else {
		// Current chain is supported (BSC and ETH). Smart Contract Interaction.
		// Retrieve saved user's public key to make HashDit API call
		const persistedUserData = await snap.request({
			method: 'snap_manageState',
			params: { operation: 'get' },
		});

		let contentArray: any[] = [];
		if (persistedUserData !== null) {
			// Parallelize Transaction, Destination, and Website Screening calls
			const [interactionRespData, addressSecurityResult, urlRespData] =
				await Promise.all([
					getHashDitResponse(
						'hashdit_snap_tx_api_transaction_request',
						persistedUserData,
						transactionOrigin,
						transaction,
						chainId,
					),
					callHashDitAddressSecurityV2(
						chainId,
						transaction.to,
						persistedUserData.DiTingApiKey,
					),
					getHashDitResponse(
						'hashdit_snap_tx_api_url_detection',
						persistedUserData,
						transactionOrigin,
					),
				]);
			// ToDo: Re-add Simulation code
			// const [
			// 	interactionRespData,
			// 	addressRespData,
			// 	urlRespData,
			// 	txSimulationContentArray,
			// ] = await Promise.all([
			// 	getHashDitResponse(
			// 		'hashdit_snap_tx_api_transaction_request',
			// 		persistedUserData,
			// 		transactionOrigin,
			// 		transaction,
			// 		chainId,
			// 	),
			// 	getHashDitResponse(
			// 		'internal_address_lables_tags',
			// 		persistedUserData,
			// 		transactionOrigin,
			// 		transaction,
			// 		chainId,
			// 	),
			// 	getHashDitResponse(
			// 		'hashdit_snap_tx_api_url_detection',
			// 		persistedUserData,
			// 		transactionOrigin,
			// 	),
			// 	callDiTingTxSimulation(
			// 		persistedUserData,
			// 		chainId,
			// 		transaction.to,
			// 		transaction.from,
			// 		transaction.gas,
			// 		transaction.value,
			// 		transaction.data,
			// 	),
			// ]);

			// Address Poisoning Detection on destination address and function parameters
			let targetAddresses = [];
			// Add destination address to `targetAddresses[]`
			targetAddresses.push(transaction.to);
			// Add all addresses from the function's parameters to `targetAddresses[]`
			//console.log("interactionRespData",interactionRespData)
			if (
				interactionRespData.function_name != null &&
				interactionRespData.function_name != ''
			) {
				// Loop through each function parameter
				for (const param of interactionRespData.function_params) {
					// Store only the values of type `address`
					if (param.type == 'address') {
						targetAddresses.push(param.value);
					}
				}
			}
			const poisonResultArray = addressPoisoningDetection(
				accounts,
				targetAddresses,
			);

			if (poisonResultArray.length != 0) {
				contentArray = poisonResultArray;
			}

			if (addressSecurityResult != null) {
				const addressSecurityArray = createContentForAddressSecurityV2(
					addressSecurityResult,
				);
				contentArray.push(...addressSecurityArray);
			}

			// We display the bigger risk between Transaction screening and Destination screening
			// console.log(
			// 	'interactionRespData',
			// 	JSON.stringify(interactionRespData),
			// );
			// console.log('addressRespData', JSON.stringify(addressRespData));
			// if (
			// 	interactionRespData.overall_risk >= addressRespData.overall_risk
			// ) {
			// 	const [riskTitle, riskOverview] =
			// 		determineTransactionAndDestinationRiskInfo(
			// 			interactionRespData.overall_risk,
			// 		);
			// 	contentArray.push(
			// 		heading('Transaction Screening'),
			// 		row('Risk Level', text(riskTitle)),
			// 		row('Risk Overview', text(riskOverview)),
			// 		row(
			// 			'Risk Details',
			// 			text(interactionRespData.transaction_risk_detail),
			// 		),
			// 		divider(),
			// 	);
			// } else {
			// 	const [riskTitle, riskOverview] =
			// 		determineTransactionAndDestinationRiskInfo(
			// 			addressRespData.overall_risk,
			// 		);
			// 	contentArray.push(
			// 		heading('Destination Screening'),
			// 		row('Risk Level', text(`${riskTitle}`)),
			// 		row(
			// 			'Risk Details',
			// 			text(`${addressRespData.transaction_risk_detail}`),
			// 		),
			// 		text(`${riskOverview}`),
			// 		divider(),
			// 	);
			// }

			// Display Website Screening results
			contentArray.push(
				heading('Website Screening'),
				row('Website', text(transactionOrigin)),
				row('Risk Level', text(urlRespData.url_risk_level)),
				text(urlRespData.url_risk_detail),
				divider(),
			);

			// console.log('txSimulationContentArray', txSimulationContentArray);
			// if (txSimulationContentArray != undefined) {
			// 	contentArray.push(...txSimulationContentArray);

			const signatureCheckResultArray = await verifyContractAndFunction(
				transaction,
				chainId,
				persistedUserData.DiTingApiKey,
			);
			if (signatureCheckResultArray.length !== 0) {
				contentArray.push(...signatureCheckResultArray);
			}

			// Display function call insight (function names and parameters)
			if (
				interactionRespData.function_name != null &&
				interactionRespData.function_name != ''
			) {
				contentArray.push(
					divider(),
					heading(
						`Function Name: ${interactionRespData.function_name}`,
					),
				);
				// Loop through each function parameter and display its values
				const params = interactionRespData.function_params;
				const lastIndex = params.length - 1;

				params.forEach((param, index) => {
					contentArray.push(
						row('Name', text(param.name)),
						row('Type', text(param.type)),
					);

					// If the parameter is 'address' type, then we use address UI for the value
					if (param.type === 'address') {
						contentArray.push(row('Value', address(param.value)));
					} else {
						contentArray.push(row('Value', text(param.value)));
					}

					// Add a divider if it's not the last parameter
					if (index !== lastIndex) {
						contentArray.push(divider());
					}
				});
			}
		} else {
			// User public key not found, display error message to snap
			contentArray = [
				heading('HashDit Securitfy Insights'),
				text('⚠️ The full functionality of HashDit is not working. ⚠️'),
				text('To resolve this issue, please follow these steps:'),
				divider(),
				text(
					"**(1)** _Click on the 'Reconnect' or 'Install' button on the HashDit website to install the Snap._",
				),
				text(
					'**(2)** _Install the snap by approving the required permissions._',
				),
				text(
					'**(3)** _Confirm your identity by signing the provided message._',
				),
			];
		}

		const content = panel(contentArray);
		return { content };
	}
};

export const onHomePage: OnHomePageHandler = async () => {
	return {
		content: panel(onHomePageContent),
	};
};
