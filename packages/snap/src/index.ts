import type { OnTransactionHandler, OnRpcRequestHandler } from '@metamask/snaps-types';
import { heading, panel, text, copyable, divider } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';
import { getHashDitResponse, parseTransactingValue, getNativeToken } from "./utils/utils";
import { CHAINS_INFO } from "./utils/chains";


// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction, brokenChainId, transactionOrigin }) => {

  /** 
   *Transaction is a native token transfer. Only check if current chain is supported since the transfer will not interact with a URL.
   *The key `data` in object `transaction` only exists in smart contract interactions and not native transfers.
   *We can use this to determine the type of transaction (native transfer or contract interaction).
   */ 

  if (!transaction.hasOwnProperty('data')) {
    const chainId = await ethereum.request({ method: "eth_chainId"});
    // Current chain is not BSC. Display not supported text.
    if(chainId !== '0x38'){
      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);

      let contentArray: any[] = [ 
        text(`chainID: ${chainId}`),
        heading('Transfer Details'),
        text(`You are transfering **${transactingValue}** **${nativeToken}** to **${transaction.to}**`),
        divider(),
      ];

      if(CHAINS_INFO.hasOwnProperty(chainId)){
        const explorerURL = CHAINS_INFO[chainId].url;
        contentArray = contentArray.concat([
          heading(`View Destination Address On Explorer`),
          copyable(`${explorerURL}${transaction.to}`),
          divider(),
        ])
      }

      contentArray = contentArray.concat([        
        text("HashDit Security Insights is not fully supported on this chain."),
        divider(),
        text("Currently we only support the **BSC Mainnet**."),
      ])
      
      const content = panel(contentArray);
      return { content };
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
          text(`chainID: ${chainId}`),
          heading('HashDit Transaction Screening'),
          text(`Overall risk: **${respData.overall_risk_title}**`),
          text(`Risk Overview: **${respData.overall_risk_detail}**`),
          text(`Risk Details: **${respData.transaction_risk_detail}**`),
          divider(),
        ];
      } else {
        contentArray = [
          text(`chainID: ${chainId}`),
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

      if(CHAINS_INFO[chainId].url){
        const explorerURL = CHAINS_INFO[chainId].url;
        contentArray = contentArray.concat([
          heading(`View Destination Address On Explorer`),
          copyable(`${explorerURL}${transaction.to}`),
          divider(),
        ])
      }

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
  const chainId = await ethereum.request({ method: "eth_chainId"});
  // Current chain is not BSC. Only perform URL screening
  if(chainId !== '0x38'){
    const urlRespData = await getHashDitResponse( "hashdit_snap_tx_api_url_detection", transactionOrigin);
    console.log("urlRespData: ", urlRespData);

    let contentArray: any[] = [      
    ];

    contentArray = contentArray.concat([   
      text(`chainID: ${chainId}`),   
      heading('URL Risk Information'),
      text(`The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`),
      divider(),
      text("HashDit Security Insights is not fully supported on this chain. Only URL screening is performed."),
      text("Currently we only support the **BSC Mainnet**."),
    ]);

    const content = panel(contentArray);
    return { content };
    
  }
  // Current chain is BSC. Perform smart contract interaction insights
  else{
    const respData = await getHashDitResponse( "hashdit_snap_tx_api_transaction_request", transactionOrigin, transaction, chainId);
    console.log("respData: ", respData);
  
    let contentArray = [
      text(`chainID: ${chainId}`),
      heading('HashDit Transaction Screening'),
      text(`Overall risk: ${respData.overall_risk_title}`),
      text(`Risk Overview: ${respData.overall_risk_detail}`),
      text(`Risk Details: ${respData.transaction_risk_detail}`),
      divider(),
    ];
    
    if (respData.function_name !== "") {
      contentArray = contentArray.concat([
        heading(`${respData.function_name}`),
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