import type { OnTransactionHandler, OnRpcRequestHandler } from '@metamask/snaps-types';
import { heading, panel, text, copyable, divider } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';
import { getHashDitResponse } from "./utils/utils";
import { SUPPORTED_CHAINS } from "./utils/chains";


// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId, transactionOrigin }) => {
  //const response = await getHashDitResponse(transaction);
  //console.log(response);


  /* 
    Transaction is native token transfer, therefore only check if current chain is supported.
    The key `data` in object `transaction` only exists in smart contract interactions and not native transfers.
    We can use this to determine the type of transaction (native transfer or contract interaction).
  */ 
  if (!transaction.hasOwnProperty('data')) {
    // Check if the current chain is supported by this Snap. If not supported, display "not supported" text.
    const explorerURL = SUPPORTED_CHAINS[chainId]?.url;
    if(explorerURL === undefined){
      return{
        content: panel([
          heading('HashDit Security Insights'),
          text("HashDit Security Insights is not supported on this chain."),
          text("Currently we support **Ethereum Mainnet**, **Sepolia Testnet**, **BSC Mainnet**, and **BSC Testnet**")
        ])
      }
    }
    // Otherwise, display token transfer insights
    else{
      const respData = await getHashDitResponse(transaction, transactionOrigin, chainId, "hashdit_snap_tx_api_transaction_request");
      console.log("respData: ", respData);
      return {
        content: panel([
          text(`${transaction.data}`),
          heading('HashDit Security Insights'),
          text(
            `You are transfering **${transaction.value}** to **${transaction.to}**`
          ),
          divider(),
          heading('HashDit Security Response'),
          text(
            `HashDit Response: `,
            `Transaction risk score: **${respData.detection_result.risks.risk_level}**`
            ),
    
          divider(),
          heading(
            `View Destination Address On Explorer`
          ),
          copyable(`${explorerURL}${transaction.to}`),
        ])
      }
    }
  }

  // Transaction is an interaction with a smart contract because key `data` was found in object `transaction`
  const respData = getHashDitResponse(transaction, transactionOrigin, chainId, "hashdit_snap_tx_api_url_detection");
  return {
    content: panel([
      heading('HashDit Security Insights'),
      text(
        `You are interacting with contract **${transaction.to}**`
      ),
      divider(),
      heading('HashDit Security Response'),
      text(
        `HashDit Response: `,
        ),
      divider(),
      // Todo: Call HashDit api here to determine if a url is safe -- Pat: Let's call outside of the return and pass the response in
      text(`The url **${transactionOrigin}** has a risk score of **${respData.risk_level}**`),
      divider(),
      text(`**${respData.risk_detail}**`)
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