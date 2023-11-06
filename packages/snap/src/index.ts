import type { OnTransactionHandler, OnRpcRequestHandler } from '@metamask/snaps-types';
import { heading, panel, text, copyable, divider } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';
import { getHashDitResponse, parseTransactingValue, getNativeToken } from "./utils/utils";
import { SUPPORTED_CHAINS } from "./utils/chains";


// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId, transactionOrigin }) => {

  /** 
   *Transaction is a native token transfer. Only check if current chain is supported since the transfer will not interact with a URL.
   *The key `data` in object `transaction` only exists in smart contract interactions and not native transfers.
   *We can use this to determine the type of transaction (native transfer or contract interaction).
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
      const respData = await getHashDitResponse("hashdit_native_transfer", transactionOrigin, transaction, chainId);
      console.log("respData: ", respData);

      // We also need to add seperate URL screening, as the native transfer hashdit endpoint doesnt have url screening
      const urlRespData = await getHashDitResponse( "hashdit_snap_tx_api_url_detection", transactionOrigin);
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
          divider(),
        ];
      }

      contentArray = contentArray.concat([
        heading('URL Risk Information'),
        text(`The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`),
        divider(),
      ]);

      contentArray = contentArray.concat([
        heading('Transfer Details'),
        text(`You are transfering **${transactingValue}** **${nativeToken}** to **${transaction.to}**`),
        divider(),
      ]);
      

      contentArray = contentArray.concat([
        heading(`View Destination Address On Explorer`),
        copyable(`${explorerURL}${transaction.to}`),
        divider(),
      ]);

      // We should try to make this smaller somehow
      contentArray = contentArray.concat([
        heading('HashDit Trace-ID'),
        text(`${respData.trace_id}`),
      ]);

      const content = panel(contentArray);
      return { content };
    }
  }
  // Transaction is an interaction with a smart contract because key `data` was found in object `transaction`
  const explorerURL = SUPPORTED_CHAINS[chainId]?.url;
  // Current chain is not supported. Only perform URL screening
  console.log(chainId, explorerURL);
  if(explorerURL === undefined){
    const urlRespData = await getHashDitResponse( "hashdit_snap_tx_api_url_detection", transactionOrigin);
    console.log("urlRespData: ", urlRespData);

    let contentArray: any[] = [      
    ];

    contentArray = contentArray.concat([      
      heading('URL Risk Information'),
      text(`The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`),
      divider(),
    ]);

    contentArray = contentArray.concat([
      text("HashDit Security Insights is not fully supported on this chain. Only URL screening is performed"),
      text("Currently we support **Ethereum Mainnet**, **Sepolia Testnet**, **BSC Mainnet**, and **BSC Testnet**"),
    ]);
    
    const content = panel(contentArray);
    return { content };
    
  }
  // Current chain is supported. Perform smart contract interaction insights
  else{
    const respData = await getHashDitResponse( "hashdit_snap_tx_api_transaction_request", transactionOrigin, transaction, chainId);
    console.log("respData: ", respData);
  
    let contentArray = [
      heading('HashDit Transaction Screening'),
      text(`Overall risk: ${respData.overall_risk_title}`),
      text(`Risk Overview: ${respData.overall_risk_detail}`),
      text(`Risk Details: ${respData.transaction_risk_detail}`),
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
      text(`${respData.trace_id}`),
    ]);
    
    const content = panel(contentArray);
    return { content };
  }


};