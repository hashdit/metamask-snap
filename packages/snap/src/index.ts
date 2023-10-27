import type { OnTransactionHandler } from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';

import { formatHashDitQuery } from "./utils/utils";

// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction, chainId, transactionOrigin }) => {
  const response = await formatHashDitQuery(transaction);
  console.log(response);

  return {
  content: panel([
    heading('HashDit Security Insights'),
    text(
      `As set up, you are transfering to **${transaction.to}**`,
      ),
    heading('HashDit Security Response'),
    text(
      `HashDit Response: **${response}**`,
      ),
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