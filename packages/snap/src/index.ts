import type { OnTransactionHandler, OnRpcRequestHandler } from '@metamask/snaps-types';
import { heading, panel, text, copyable, divider } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';
import { getHashDitResponse, parseTransactingValue, getNativeToken } from "./utils/utils";
import { SUPPORTED_CHAINS } from "./utils/chains";

// https://github.com/here-wallet/near-snap/blob/main/packages/snap/src/index.ts <- example of how to use this
export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  const methods = request.method;
};


// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId, transactionOrigin }) => {

  /* 
    Transaction is native token transfer. Only check if current chain is supported since the transfer will not interact with a URL.
    The key `data` in object `transaction` only exists in smart contract interactions and not native transfers.
    We can use this to determine the type of transaction (native transfer or contract interaction).
  */ 

  if (!transaction.hasOwnProperty('data')) {
    // Check if the current chain is supported by this Snap.
    const explorerURL = SUPPORTED_CHAINS[chainId]?.url;
    // Current chain is not supported. Display not supported text.
    if(explorerURL === undefined){
      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);

      return{
        content: panel([
          heading('HashDit Security Insights'),

          divider(),
          heading('Transfer Details'),
          text(`You are transfering **${transactingValue}** **${nativeToken}** to **${transaction.to}**`),

          divider(),
          text("HashDit Security Insights is not fully supported on this chain."),

          divider(),
          text("Currently we support **Ethereum Mainnet**, **Sepolia Testnet**, **BSC Mainnet**, and **BSC Testnet**"),
        ])
      }
    }
    // Current chain is supported. Display token transfer insights
    else{
      const respData = await getHashDitResponse(transaction, transactionOrigin, chainId, "hashdit_native_transfer");
      console.log("respData: ", respData);

      // We also need to add seperate URL screening, as the native transfer hashdit endpoint doesnt have url screening
      const urlRespData = await getHashDitResponse(transaction, transactionOrigin, chainId, "hashdit_snap_tx_api_url_detection");
      console.log("urlRespData: ", urlRespData);
      
      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);

      let contentArray: any[] = [];

      if (respData.overall_risk_title != "Unknown Risk") {
        contentArray = [
          heading('HashDit Transaction Screening'),
          text(`Overall risk: **${respData.overall_risk_title}**`),
          text(`Risk Overview: **${respData.overall_risk_detail}**`),
          text(`Risk Details: **${respData.transaction_risk_detail}**`),
          divider(),
        ];
      } else {
        contentArray = [
          heading('HashDit Transaction Screening'),
          text(`Overall risk: **${respData.overall_risk_title}**`),
          //heading('Transfer Details'),
          //text(`You are transfering **${transactingValue}** **${nativeToken}** to **${transaction.to}**`),
          divider(),
        ];
      }
      
      contentArray = contentArray.concat([
        heading('URL Risk Information'),
        text(`The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`),
        divider(),
      ]);

      // We should try to make this smaller somehow
      contentArray = contentArray.concat([
        heading('HashDit Trace-ID'),
        text(`**${respData.trace_id}**`),
      ]);

      // Copyable below causes error
      // contentArray = contentArray.concat([
      //   heading(`View Destination Address On Explorer`),
      //   copyable(`${explorerURL}${transaction.to}`),
      // ]);
      
      const content = panel(contentArray);
      return { content };
    }
  }
  // Transaction is an interaction with a smart contract because key `data` was found in object `transaction`
  const respData = await getHashDitResponse(transaction, transactionOrigin, chainId, "hashdit_snap_tx_api_transaction_request");
  console.log("respData: ", respData);

  let contentArray = [
    heading('HashDit Transaction Screening'),
    text(`Overall risk: **${respData.overall_risk_title}**`),
    text(`Risk Overview: **${respData.overall_risk_detail}**`),
    text(`Risk Details: **${respData.transaction_risk_detail}**`),
    divider(),
  ];
  
  if (respData.function_name !== "") {
    contentArray = contentArray.concat([
      heading(`**${respData.function_name}**`),
      text(`**${respData.function_param1}**`),
      text(`**${respData.function_param2}**`),
      divider(),
    ]);
  }

  contentArray = contentArray.concat([
    heading('URL Risk Information'),
    text(`The URL **${transactionOrigin}** has a risk of **${respData.url_risk}**`),
    divider(),
  ]);

  // We should try to make this smaller somehow
  contentArray = contentArray.concat([
    heading('HashDit Trace-ID'),
    text(`**${respData.trace_id}**`),
  ]);
  
  const content = panel(contentArray);
  return { content };
  };
//   else{
//     // Check if the current chain is supported by this Snap.
//     const explorerURL = SUPPORTED_CHAINS[chainId]?.url;
//     // Current chain is not supported. Only perform url risk assessment since hashdit can still perform url detection regardless of chain.
//     if(explorerURL === undefined){
//       const respData = await getHashDitResponse(transaction, transactionOrigin, chainId, "hashdit_snap_tx_api_url_detection");

//       return{
//         content: panel([
//           heading('HashDit Security Insights'),
//           text(`The URL **${transactionOrigin}** has a risk level of **${respData.url_risk_level}**`),
//           text(`Overall risk: **${respData.url_risk_title}**`),
//           text(`Risk details: **${respData.url_risk_detail}**`),

//           divider(),
//           text("HashDit Security Insights is not fully supported on this chain. Only url risk detection is supported."),

//           divider(),
//           text("Currently we fully support **Ethereum Mainnet**, **Sepolia Testnet**, **BSC Mainnet**, and **BSC Testnet**")
//         ])
//       }
//     }
//     // Chain is supported by this snap. Get full risk assessment.
//     else{
//       const respData = await getHashDitResponse(transaction, transactionOrigin, chainId, "hashdit_snap_tx_api_transaction_request");
//       console.log("respData: ", respData);

//       return {
//         content: panel([
//           heading('HashDit Transaction Screening'),
//           text(`Overall risk: **${respData.overall_risk_title}**`),
//           text(`Risk details: **${respData.overall_risk_detail}**`),
//           text(`Transaction risk: **${respData.transaction_risk_detail}**`),
//           text(`**${respData.function_param1}**`), // If function_param1 is empty, this text will not be displayed
//           text(`**${respData.function_param2}**`),
  
//           divider(),
//           text(`The URL **${transactionOrigin}** has a risk score of **${respData.overall_risk}**`),
  
//           divider(),
//           text(`**${respData.overall_risk_title}**`),
//           text(`**${respData.overall_risk_detail}**`)
//           ]),
//       };
//     }
//   }
// };
