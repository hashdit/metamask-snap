import type { OnTransactionHandler } from '@metamask/snaps-types';
import { heading, panel, text, copyable, divider } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';

import { getHashDitResponse } from "./utils/utils";
import { SUPPORTED_CHAINS } from "./utils/chains";

// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId, transactionOrigin }) => {
  //const response = await getHashDitResponse(transaction);
  //console.log(response);

  // Check if the current chain is supported by this Snap. If not supported, display "not supported" text.
  const explorerURL = SUPPORTED_CHAINS[chainId]?.url;
  if(explorerURL === undefined){
    return{
      content: panel([
        heading('HashDit Security Insights'),
        text("HashDit Security Insights is not supported on this chain."),
        text("Currently we support **Ethereum Mainnet**, **Sepolia Testnet**, **BSC Mainnet**, and **BSC Testnet**")
        ]),
    }
  }

  

  return {
    content: panel([
      text(`${transaction.data}`),
      heading('HashDit Security Insights'),
      text(
        `As set up, you are transfering to **${transaction.to}**`
      ),
      divider(),
      heading('HashDit Security Response'),
      text(
        `HashDit Response: `,
        ),

      divider(),
      heading(
        `View Destination Address On Explorer`
      ),
      copyable(`${explorerURL}${transaction.to}`),
      ]),
      
    };
  };
// return {
//   content: panel([
//     heading('HashDit Security Insights'),
//     text(
//       `As set up, you are paying **${gasFeesPercentage.toFixed(
//         2,
//       )}%** in gas fees for this transaction.`,
//     ),
//   ]),
// };
// };