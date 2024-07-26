import type {
  OnTransactionHandler,
  OnInstallHandler,
  OnHomePageHandler,
  OnRpcRequestHandler,
  OnCronjobHandler,
} from '@metamask/snaps-sdk';
import {
  heading,
  panel,
  text,
  divider,
  address,
  row,
  UnauthorizedError,
  MethodNotFoundError,
  NotificationType,
} from '@metamask/snaps-sdk';
import {
  getHashDitResponse,
  parseTransactingValue,
  getNativeToken,
  authenticateHashDit,
  isEOA,
  addressPoisoningDetection,
  determineTransactionAndDestinationRiskInfo,
} from './utils/utils';
import { extractPublicKeyFromSignature } from './utils/cryptography';

export const onInstall: OnInstallHandler = async () => {
  // Show install instructions and links
  await snap.request({
    method: 'snap_dialog',
    params: {
      type: 'alert',
      content: panel([
        heading('🛠️ Next Steps For Your Installation'),
        text('**Step 1**'),
        text(
          ' To ensure the most secure experience, please connect all your MetaMask accounts with the HashDit Snap.',
        ),
        text('**Step 2**'),
        text(
          'Sign the Hashdit Security message request. This is required to enable the HashDit API to enable a complete experience.',
        ),
        divider(),
        heading('🔗 Links'),
        text(
          'HashDit Snap Official Website: [Hashdit](https://www.hashdit.io/en/snap)',
        ),
        text(
          'Installation Guide: [Installation](https://hashdit.gitbook.io/hashdit-snap/usage/installing-hashdit-snap)',
        ),
        text(
          'How To Use Hashdit Snap: [Usage](https://hashdit.gitbook.io/hashdit-snap/usage/how-to-use-hashdit-snap)',
        ),
        text('Documentation: [Docs](https://hashdit.gitbook.io/hashdit-snap)'),
        text(
          'FAQ/Knowledge Base: [FAQ](https://hashdit.gitbook.io/hashdit-snap/information/faq-and-knowledge-base)',
        ),
        text(
          'MetaMask Store Page: [Snap Store](https://snaps.metamask.io/snap/npm/hashdit-snap-security/)',
        ),
        divider(),
        heading('Thank you for using HashDit Snap!'),
      ]),
    },
  });
  try {
    // Get user's accounts
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const from = accounts[0];

    // TODO: Make this more user-friendly?
    // Request user to sign a message -> get user's signature -> get user's public key.
    const message = `Hashdit Security: ${from}, Please sign this message to authenticate the HashDit API.`;
    const signature = await ethereum.request({
      method: 'personal_sign',
      params: [message, from],
    });
    let publicKey = extractPublicKeyFromSignature(message, signature, from);
    publicKey = publicKey.substring(2);

    try {
      // Save public key here and user address here:
      await snap.request({
        method: 'snap_manageState',
        params: {
          operation: 'update',
          newState: {
            publicKey: publicKey,
            userAddress: from,
            messageSignature: signature,
          },
        },
      });
    } catch (error) {}

    try {
      const persistedData = await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      });

      await authenticateHashDit(persistedData); // call HashDit API to authenticate user
    } catch (error) {}
    return true;
  } catch (error) {}
};

export const onCronjob: OnCronjobHandler = async ({ request }) => {
  switch (request.method) {
    case 'execute':
      // Cron jobs can execute any method that is available to the Snap.
      return snap.request({
        method: 'snap_notify',
        params: {
          type: 'native',
          message: 'Native Hello, world!',
        },
      });

    default:
      throw new Error('Method not found.');
  }
};

// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({
  transaction,
  transactionOrigin,
}) => {
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
        text(`Error: ChainId could not be retreived (${chainId})`),
      ];
      const content = panel(contentArray);
      return { content };
    }
    // Current chain is not supported (not BSC or ETH). Native Token Transfer.
    if (chainId !== '0x38' && chainId !== '0x1') {
      // Retrieve saved user's public key to make HashDit API call
      const persistedUserPublicKey = await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      });

      let contentArray: any[] = [];
      var urlRespData;
      if (persistedUserPublicKey !== null) {
        const poisonResultArray = addressPoisoningDetection(accounts, [
          transaction.to,
        ]);
        if (poisonResultArray.length != 0) {
          contentArray = poisonResultArray;
        }

        // URL Screening call
        urlRespData = await getHashDitResponse(
          'hashdit_snap_tx_api_url_detection',
          persistedUserPublicKey,
          transactionOrigin,
        );
        contentArray.push(
          heading('URL Screening'),
          row('Website', text(transactionOrigin)),
          row('Risk Level', text(urlRespData.url_risk_level)),
          text(urlRespData.url_risk_detail),
          divider(),
        );
      } else {
        contentArray.push(
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
        );
      }

      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);

      contentArray.push(
        heading('Transfer Details'),
        row('Your Address', address(transaction.from)),
        row('Amount', text(`${transactingValue} ${nativeToken}`)),
        row('To', address(transaction.to)),
        divider(),
      );

      contentArray.push(
        text('HashDit Security Insights is not fully supported on this chain.'),
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
      const persistedUserPublicKey = await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      });

      let contentArray: any[] = [];
      var respData;
      var urlRespData;
      if (persistedUserPublicKey !== null) {
        const poisonResultArray = addressPoisoningDetection(accounts, [
          transaction.to,
        ]);
        if (poisonResultArray.length != 0) {
          contentArray = poisonResultArray;
        }

        // Parallelize Destination Screening call and URL Screening call
        const [respData, urlRespData] = await Promise.all([
          getHashDitResponse(
            'internal_address_lables_tags',
            persistedUserPublicKey,
            transactionOrigin,
            transaction,
            chainId,
          ),
          getHashDitResponse(
            'hashdit_snap_tx_api_url_detection',
            persistedUserPublicKey,
            transactionOrigin,
          ),
        ]);

        if (respData.overall_risk != '-1') {
          const [riskTitle, riskOverview] =
            determineTransactionAndDestinationRiskInfo(respData.overall_risk);
          contentArray.push(
            heading('Destination Screening'),
            text(`**Risk Level:** ${riskTitle}`),
            text(`**Risk Overview:** ${riskOverview}`),
            text(`**Risk Details:** ${respData.transaction_risk_detail}`),
            divider(),
          );
        } else {
          contentArray.push(
            heading('Destination Screening'),
            text(`**Risk Level:** Unknown`),
            text(
              `**Risk Overview:** The risk level of this transaction is unknown. Please proceed with caution.`,
            ),
            divider(),
          );
        }

        contentArray.push(
          heading('URL Screening'),
          row('Website', text(transactionOrigin)),
          row('Risk Level', text(urlRespData.url_risk_level)),
          text(urlRespData.url_risk_detail),
          divider(),
        );
      } else {
        contentArray.push(
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
        );
      }

      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);

      contentArray.push(
        heading('Transfer Details'),
        row('Your Address', address(transaction.from)),
        row('Amount', text(`${transactingValue} ${nativeToken}`)),
        row('To', address(transaction.to)),
      );

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
      text(`Error: ChainId could not be retreived (${chainId})`),
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
      // URL Screening call
      const urlRespData = await getHashDitResponse(
        'hashdit_snap_tx_api_url_detection',
        persistedUserData,
        transactionOrigin,
      );
      contentArray = [
        heading('URL Screening'),
        row('Website', text(transactionOrigin)),
        row('Risk Level', text(urlRespData.url_risk_level)),
        text(urlRespData.url_risk_detail),
        divider(),
        text('HashDit Security Insights is not fully supported on this chain.'),
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
          'HashDit Security Insights is not fully supported on this chain. Only URL screening has been performed.',
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
    const persistedUserPublicKey = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get' },
    });

    let contentArray: any[] = [];
    if (persistedUserPublicKey !== null) {
      // Parallelize Transaction, Destination, and URL screening calls
      const [interactionRespData, addressRespData, urlRespData] =
        await Promise.all([
          getHashDitResponse(
            'hashdit_snap_tx_api_transaction_request',
            persistedUserPublicKey,
            transactionOrigin,
            transaction,
            chainId,
          ),
          getHashDitResponse(
            'internal_address_lables_tags',
            persistedUserPublicKey,
            transactionOrigin,
            transaction,
            chainId,
          ),
          getHashDitResponse(
            'hashdit_snap_tx_api_url_detection',
            persistedUserPublicKey,
            transactionOrigin,
          ),
        ]);

      // Address Poisoning Detection on destination address and function parameters
      let targetAddresses = [];
      // Add destination address to `targetAddresses[]`
      targetAddresses.push(transaction.to);
      // Add all addresses from the function's parameters to `targetAddresses[]`
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
      if (interactionRespData.overall_risk >= addressRespData.overall_risk) {
        const [riskTitle, riskOverview] =
          determineTransactionAndDestinationRiskInfo(
            interactionRespData.overall_risk,
          );
        contentArray.push(
          heading('Transaction Screening'),
          text(`**Risk Level:** ${riskTitle}`),
          text(`**Risk Overview:** ${riskOverview}`),
          text(
            `**Risk Details:** ${interactionRespData.transaction_risk_detail}`,
          ),
        );
      } else {
        const [riskTitle, riskOverview] =
          determineTransactionAndDestinationRiskInfo(
            interactionRespData.overall_risk,
          );
        contentArray.push(
          heading('Destination Screening'),
          text(`**Risk Level:** ${riskTitle}`),
          text(`**Risk Overview:** ${riskOverview}`),
          text(`**Risk Details:** ${addressRespData.transaction_risk_detail}`),
        );
      }

      // Display URL screening results
      contentArray.push(
        divider(),
        heading('URL Screening'),
        row('Website', text(transactionOrigin)),
        row('Risk Level', text(urlRespData.url_risk_level)),
        text(urlRespData.url_risk_detail),
      );

      /*
      Only display Transfer Details if transferring more than 0 native tokens
      This is a contract interaction. This check is necessary here because not all contract interactions transfer tokens.
      */
      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);
      if (transactingValue > 0) {
        contentArray.push(
          divider(),
          heading('Transfer Details'),
          row('Your Address', address(transaction.from)),
          row('Amount', text(`${transactingValue} ${nativeToken}`)),
          row('To', address(transaction.to)),
        );
      }

      // Display function call insight (function names and parameters)
      if (
        interactionRespData.function_name != null &&
        interactionRespData.function_name != ''
      ) {
        contentArray.push(
          divider(),
          heading(`Function Name: ${interactionRespData.function_name}`),
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
      ];
    }

    const content = panel(contentArray);
    return { content };
  }
};

export const onHomePage: OnHomePageHandler = async () => {
  return {
    content: panel([
      heading('HashDit Snap'),
      text(
        'Explore the power of HashDit Security and fortify your MetaMask experience. Navigate the crypto space with confidence.',
      ),
      divider(),
      heading('🔗 Links'),
      text(
        'HashDit Snap Official Website: [Hashdit](https://www.hashdit.io/en/snap)',
      ),
      text(
        'Installation Guide: [Installation](https://hashdit.gitbook.io/hashdit-snap/usage/installing-hashdit-snap)',
      ),
      text(
        'How To Use Hashdit Snap: [Usage](https://hashdit.gitbook.io/hashdit-snap/usage/how-to-use-hashdit-snap)',
      ),
      text('Documentation: [Docs](https://hashdit.gitbook.io/hashdit-snap)'),
      text(
        'FAQ/Knowledge Base: [FAQ](https://hashdit.gitbook.io/hashdit-snap/information/faq-and-knowledge-base)',
      ),
      text(
        'MetaMask Store Page: [Snap Store](https://snaps.metamask.io/snap/npm/hashdit-snap-security/)',
      ),
      divider(),
      heading('Thank you for using HashDit Snap!'),
    ]),
  };
};
