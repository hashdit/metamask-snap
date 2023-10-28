import type { OnTransactionHandler } from '@metamask/snaps-types';
import { heading, panel, text, copyable, divider } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';

import { getHashDitResponse } from "./utils/utils";
import { SUPPORTED_CHAINS } from "./utils/chains";

// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId, transactionOrigin }) => {
  //const response = await getHashDitResponse(transaction);
  //console.log(response);

  // Check if the current chain is supported
  if(!Object.values(SUPPORTED_CHAINS).includes(chainId) ){
    return{
      content: panel([g
        heading('HashDit Security Insights'),
        text("Not supported on this chain"),
        text(chainId)
        ]),
    }
  }
  // else{
  // // Build the blockchain explorer URL
  // // Reference: https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md#syntax
  //   var explorerURL = null;
  //   switch (chainId) {
  //     // Sepolia testnet
  //     case '11155111':
  //       explorerURL = "https://sepolia.etherscan.io/address/";
  //       break;
  //     // BSC mainnet
  //     case '56':
  //       explorerURL = "https://bscscan.com/address/";
  //       break;
  //     // BSC testnet
  //     case '97':
  //       explorerURL = "https://testnet.bscscan.com/address/"
  //     break;
  //     // opBNB mainnet
  //     case '204':
  //       explorerURL = "https://opbnbscan.com/address/"
  //     break;
  //     // opBNB testnet
  //     case '5611':
  //       explorerURL = "https://testnet.opbnbscan.com/address/"
  //     break;
  //   }
  // }



  
  return {
  content: panel([
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
    //copyable(`${explorerURL}${transaction.to}`),
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