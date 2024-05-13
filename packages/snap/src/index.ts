import type {
  OnTransactionHandler,
  OnRpcRequestHandler,
  OnInstallHandler,
} from '@metamask/snaps-types';
import {
  heading,
  panel,
  text,
  copyable,
  divider,
  address,
  row,
} from '@metamask/snaps-sdk';
import {
  getHashDitResponse,
  parseTransactingValue,
  getNativeToken,
  authenticateHashDit,
  isEOA,
  addressPoisoningDetection,
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
          'HashDit Snap Official Website: [Hashdit](https://www.hashdit.io/en/snap).',
        ),
        text(
          'HashDit Snap Documentation: [GitBook](https://hashdit.gitbook.io/hashdit-snap).',
        ),
        text(
          'HashDit Snap MetaMask Store Page: [Snap Store](https://snaps.metamask.io/snap/npm/hashdit-snap-security/)',
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
    } catch (error) {
      //console.log(`Error saving public key and user address: ${error}`);
    }

    try {
      const persistedData = await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      });

      await authenticateHashDit(persistedData); // call HashDit API to authenticate user
    } catch (error) {
      //console.log(`Error retrieving persisted data: ${error}`);
    }
    return true;
  } catch (error) {
    //console.log(`Error onInstall: ${error}`);
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
    // Current chain is not supported (not BSC or ETH). Display not supported text.
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

        urlRespData = await getHashDitResponse(
          'hashdit_snap_tx_api_url_detection',
          persistedUserPublicKey,
          transactionOrigin,
        );
        contentArray.push(heading('URL Risk Information'));

        if (urlRespData.url_risk >= 2) {
          contentArray.push(text(`**${urlRespData.url_risk_title}**`));
        }
        contentArray.push(
          text(
            `The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`,
          ),
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
    // Current chain is supported (BSC or ETH). Display token transfer insights
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

        respData = await getHashDitResponse(
          'internal_address_lables_tags',
          persistedUserPublicKey,
          transactionOrigin,
          transaction,
          chainId,
        );
        urlRespData = await getHashDitResponse(
          'hashdit_snap_tx_api_url_detection',
          persistedUserPublicKey,
          transactionOrigin,
        );

        if (respData.overall_risk_title != 'Unknown Risk') {
          contentArray.push(
            heading('Transaction Screening'),
            text(`**Overall Risk:** ${respData.overall_risk_title}`),
            text(`**Risk Overview:** ${respData.overall_risk_detail}`),
            text(`**Risk Details:** ${respData.transaction_risk_detail}`),
            divider(),
          );
        } else {
          contentArray.push(
            heading('Transaction Screening'),
            text(`**Overall Risk:** ${respData.overall_risk_title}`),
            divider(),
          );
        }

        contentArray.push(heading('URL Risk Information'));

        if (urlRespData.url_risk >= 2) {
          contentArray.push(text(`**${urlRespData.url_risk_title}**`));
        }
        contentArray.push(
          text(
            `The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`,
          ),
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
  // Current chain is not supported (Not BSC and not ETH). Only perform URL screening
  if (chainId !== '0x38' && chainId !== '0x1') {
    // Retrieve saved user's public key to make HashDit API call
    const persistedUserData = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get' },
    });

    let contentArray: any[] = [];
    if (persistedUserData !== null) {
      const urlRespData = await getHashDitResponse(
        'hashdit_snap_tx_api_url_detection',
        persistedUserData,
        transactionOrigin,
      );
      contentArray = [
        heading('URL Risk Information'),
        text(
          `The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`,
        ),
        divider(),
        text(
          'HashDit Security Insights is not fully supported on this chain. Only URL screening has been performed.',
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
    // Current chain is supported (BSC and ETH).
    // Retrieve saved user's public key to make HashDit API call
    const persistedUserPublicKey = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get' },
    });

    let contentArray: any[] = [];
    if (persistedUserPublicKey !== null) {
      const interactionRespData = await getHashDitResponse(
        'hashdit_snap_tx_api_transaction_request',
        persistedUserPublicKey,
        transactionOrigin,
        transaction,
        chainId,
      );

      // Retrieve all addresses from the function's parameters to `targetAddresses[]`. Perform poison detection on these parameters.
      if (interactionRespData.function_name !== '') {
        let targetAddresses = [];
        // Add destination address to targets
        targetAddresses.push(transaction.to);
        // Loop through each function parameter
        for (const param of interactionRespData.function_params) {
          // Store only the values of type `address`
          if (param.type == 'address') {
            targetAddresses.push(param.value);
          }
        }
        const poisonResultArray = addressPoisoningDetection(
          accounts,
          targetAddresses,
        );
        if (poisonResultArray.length != 0) {
          contentArray = poisonResultArray;
        }
      }
      const addressRespData = await getHashDitResponse(
        'internal_address_lables_tags',
        persistedUserPublicKey,
        transactionOrigin,
        transaction,
        chainId,
      );
      if (interactionRespData.overall_risk >= addressRespData.overall_risk) {
        contentArray.push(
          heading('Transaction Screening'),
          text(`**Overall Risk:** ${interactionRespData.overall_risk_title}`),
          text(`**Risk Overview:** ${interactionRespData.overall_risk_detail}`),
          text(
            `**Risk Details:** ${interactionRespData.transaction_risk_detail}`,
          ),
          divider(),
        );
      } else {
        contentArray.push(
          heading('HashDit Screening'), //todo
          text(`**Overall risk:** ${addressRespData.overall_risk_title}`),
          text(`**Risk Overview:** ${addressRespData.overall_risk_detail}`),
          text(`**Risk Details:** ${addressRespData.transaction_risk_detail}`),
          divider(),
        );
      }

      contentArray.push(heading('URL Risk Information'));

      if (interactionRespData.url_risk >= 2) {
        contentArray.push(text(`**${interactionRespData.url_risk_title}**`));
      }

      contentArray.push(
        text(
          `The URL **${transactionOrigin}** has a risk of **${interactionRespData.url_risk}**`,
        ),
        divider(),
      );

      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);

      // Only display Transfer Details if transferring more than 0 native tokens
      // This is a contract interaction. This check is necessary here because not all contract interactions transfer tokens.
      if (transactingValue > 0) {
        contentArray.push(
          heading('Transfer Details'),
          row('Your Address', address(transaction.from)),
          row('Amount', text(`${transactingValue} ${nativeToken}`)),
          row('To', address(transaction.to)),
          divider(),
        );
      }

      // Display function call insight (function names and parameters)
      if (interactionRespData.function_name !== '') {
        contentArray.push(
          heading(`Function Name: ${interactionRespData.function_name}`),
        );
        // Loop through each function parameter and display its values
        for (const param of interactionRespData.function_params) {
          contentArray.push(
            row('Name:', text(param.name)),
            row('Type:', text(param.type)),
          );
          // If the parameter is 'address' type, then we use address UI for the value
          if (param.type == 'address') {
            contentArray.push(row('Value:', address(param.value)));
          } else {
            contentArray.push(row('Value:', text(param.value)));
          }
          contentArray.push(divider());
        }
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
