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
	getHashDitResponse,
	authenticateHashDit,
	isEOA,
	determineTransactionAndDestinationRiskInfo,
	
	authenticateDiTing,
} from './utils/utils';
import { parseSignature } from './utils/signatureInsight';
import { addressPoisoningDetection } from './utils/addressPoisoning';
import {verifyContractAndFunction} from './utils/unverifiedCheck';
import { callDiTingTxSimulation } from './utils/simulationUtils';
import { extractPublicKeyFromSignature } from './utils/cryptography';
import {
	onInstallContent,
	onHomePageContent,
	errorContent,
} from './utils/content';

// Called during after installation. Show install instructions and links
export const onInstall: OnInstallHandler = async () => {
	await snap.request({
		method: 'snap_dialog',
		params: {
			type: 'alert',
			content: panel(onInstallContent),
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

		let publicKey = extractPublicKeyFromSignature(
			message,
			signature,
			from,
		)?.substring(2);
		const newState: any = {
			publicKey: publicKey,
			userAddress: from,
			messageSignature: signature,
		};

		// Call HashDit API to authenticate user
		try {
			await authenticateHashDit(from, signature);
		} catch (error) {
			console.error('Error during HashDit API authentication:', error);
		}

		// Call DiTing Auth API to retrieve personal API key
		try {
			const DiTingResult = await authenticateDiTing(from, signature);
			if (DiTingResult.message === 'ok' && DiTingResult.apiKey != '') {
				newState.DiTingApiKey = DiTingResult.apiKey;
				console.log('DitingResult', DiTingResult);
			} else {
				throw new Error(
					`Authentication failed: ${DiTingResult.message}`,
				);
			}
		} catch (error) {
			console.error(
				'An error occurred during DiTing authentication:',
				error,
			);
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
			console.error(
				'An error occurred during saving to local storage:',
				error,
			);
		}
	} catch (error) {}
};

// Called during a signature request transaction. Show insights
export const onSignature: OnSignatureHandler = async ({
	signature,
	signatureOrigin,
}) => {
	console.log('OnSig:', JSON.stringify(signature, null, 2));
	// Retrieve the content array if the signature is v3 or v4
	const parseSignatureArrayResult = await parseSignature(
		signature,
		signatureOrigin,
	);

	// Return the results if they exist
	if (parseSignatureArrayResult != null) {
		const content = panel(parseSignatureArrayResult);
		console.log('pareseSigResult');
		return { content };
	}

	let contentArray: any[] = [];

	// We consider personal_sign to be safe
	if (signature.signatureMethod === 'personal_sign') {
		contentArray.push(
			heading('Signature Screening'),
			row("Risk Level", text("Low")),
			text(
				"This signature confirms that you own this address. It’s a common way to verify your identity without sharing your private key. This process is generally safe.",
			),
			divider(),
		);
	}

	// Retrieve user data, and get website risk level
	let persistedUserData = null;
	try {
		persistedUserData = await snap.request({
			method: 'snap_manageState',
			params: { operation: 'get' },
		});
	} catch (error) {
		contentArray.push(
			heading('HashDit Snap'),
			text(
				'If this is your first time installing HashDit Snap, this message is expected. An error occurred while retrieving the risk details for this transaction. If the issue persists, please try reinstalling HashDit Snap and try again.',
			),
		);
		return { content: panel(contentArray) };
	}
	// User data exists. Call website screening API, and add results to content array.
	if (persistedUserData !== null) {
		try {
			const urlResp = await getHashDitResponse(
				'hashdit_snap_tx_api_url_detection',
				persistedUserData,
				signatureOrigin,
			);

			if (urlResp) {
				contentArray.push(
					heading('Website Screening'),
					row('Website', text(signatureOrigin)),
					row('Risk Level', text(urlResp.url_risk_level)),
					text(urlResp.url_risk_detail),
				);
				return { content: panel(contentArray) };
			}
		} catch (error) {
			// Handle any errors from getHashDitResponse
			console.error('Error with HashDit Snap:', error);
			contentArray.push(
				text(
					'An error occurred while attempting to retrieve website screening information.',
				),
			);
		}
	}

	// Fallback error message if none of the above conditions were met
	return { content: panel(errorContent) };
};

// Called when a transaction is pending. Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({
	transaction,
	transactionOrigin,
}) => {
	console.log('Transaction:', JSON.stringify(transaction, null, 2));

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
	
				const [respData, urlRespData] =
					await Promise.all([
						getHashDitResponse(
							'internal_address_lables_tags',
							persistedUserData,
							transactionOrigin,
							transaction,
							chainId,
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


				if (respData.overall_risk != '-1') {
					const [riskTitle, riskOverview] =
						determineTransactionAndDestinationRiskInfo(
							respData.overall_risk,
						);
					contentArray.push(
						heading('Destination Screening'),
						row('Risk Level', text(`${riskTitle}`)),
						row(
							'Risk Details',
							text(`${respData.transaction_risk_detail}`),
						),
						text(`${riskOverview}`),
						divider(),
					);
				} else {
					contentArray.push(
						heading('Destination Screening'),
						row('Risk Level', text('Unknown')),
						text(
							'The risk level of this transaction is unknown. Please proceed with caution.',
						),
						divider(),
					);
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
			const [
				interactionRespData,
				addressRespData,
				urlRespData,
				
			] = await Promise.all([
				getHashDitResponse(
					'hashdit_snap_tx_api_transaction_request',
					persistedUserData,
					transactionOrigin,
					transaction,
					chainId,
				),
				getHashDitResponse(
					'internal_address_lables_tags',
					persistedUserData,
					transactionOrigin,
					transaction,
					chainId,
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

			// We display the bigger risk between Transaction screening and Destination screening
			console.log('interactionRespData', JSON.stringify(interactionRespData));
			console.log('addressRespData', JSON.stringify(addressRespData));
			if (
				interactionRespData.overall_risk >= addressRespData.overall_risk
			) {
				const [riskTitle, riskOverview] =
					determineTransactionAndDestinationRiskInfo(
						interactionRespData.overall_risk,
					);
				contentArray.push(
					heading('Transaction Screening'),
					row('Risk Level', text(riskTitle)),
					row('Risk Overview', text(riskOverview)),
					row(
						'Risk Details',
						text(interactionRespData.transaction_risk_detail),
					),
					divider(),
				);
			} else {
				const [riskTitle, riskOverview] =
					determineTransactionAndDestinationRiskInfo(
						addressRespData.overall_risk,
					);
				contentArray.push(
					heading('Destination Screening'),
					row('Risk Level', text(`${riskTitle}`)),
					row(
						'Risk Details',
						text(`${addressRespData.transaction_risk_detail}`),
					),
					text(`${riskOverview}`),
					divider(),
				);
			}

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

		// 	/*
	  	// Only display Transfer Details if transferring more than 0 native tokens
	  	// This is a contract interaction. This check is necessary here because not all contract interactions transfer tokens.
	  	// */
		// 	const transactingValue = parseTransactingValue(transaction.value);
		// 	const nativeToken = getNativeToken(chainId);
		// 	if (transactingValue > 0) {
		// 		contentArray.push(
		// 			divider(),
		// 			heading('Transfer Details'),
		// 			row('Your Address', address(transaction.from)),
		// 			row('Amount', text(`${transactingValue} ${nativeToken}`)),
		// 			row('To', address(transaction.to)),
		// 		);

		// 	}

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
