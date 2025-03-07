/* eslint-disable */

import {
	heading,
	panel,
	text,
	copyable,
	divider,
	address,
	row,
	Signature,
} from '@metamask/snaps-sdk';

// Perform similarity score to detect address poisoning attacks
export function addressPoisoningDetection(
	userAddresses: string[],
	targetAddresses: string[],
) {
	let resultArray: any[] = [];
	let similarityResult = detectSimilarity(userAddresses, targetAddresses);
	if (similarityResult.length > 0) {
		resultArray.push(
			heading('Address Poisoning'),
			text(
				`You are about to interact with an address that appears similar to one of your personal addresses. This could be an attempt to steal your funds. Please verify the addresses before proceeding.`,
			),
		);
		for (var i = 0; i < similarityResult.length; i++) {
			resultArray.push(
				row('Your Address', address(similarityResult[i].userAddress)),
				row(
					'Similar Address',
					address(similarityResult[i].targetAddress),
				),
				row(
					'Risk Level',
					text(`${similarityResult[i].similarityRiskLevel}`),
				),
				divider(),
			);
		}
	}
	return resultArray;
}

/**
 * The function compares the first and last 5 hexadecimals of two Ethereum addresses.
 * It assesses their prefix and postfix similarity and returns a score ranging from 0 (no similarity) to 5 (complete match).
 * Score increments only when both the 1st character of prefix & suffix match the target address.
 * Skip if the addresses are the same.
 */
function detectSimilarity(
	userAddressArray: string[],
	targetAddressArray: string[],
) {
	var similarityScoreResultArray = [];

	for (let userAddress of userAddressArray) {
		for (let targetAddress of targetAddressArray) {
			// Only compare the addresses after the `0x` prefix
			// Set to lowercase for consistency
			const userAddressConvert = userAddress.toLowerCase().substring(2);
			const targetAddressCovert = targetAddress
				.toLowerCase()
				.substring(2);

			// Addresses are identical. Don't need to consider similarity.
			if (userAddressConvert == targetAddressCovert) {
				continue;
			}

			let similarityScore = 0;
			const addressLength = 39;

			// Compare first 5 hex
			for (var i = 0; i < 5; i++) {
				if (
					userAddressConvert[i] == targetAddressCovert[i] &&
					userAddressConvert[addressLength - i] ==
						targetAddressCovert[addressLength - i]
				) {
					similarityScore += 1;
				}
			}

			// If there are more than 3 matching prefix or postfix characters, we send a warning to the user.
			if (similarityScore >= 3) {
				let similarityRiskLevel;
				switch (similarityScore) {
					case 3:
						similarityRiskLevel = '⛔ High Risk ⛔';
						break;
					case 4:
						similarityRiskLevel = '⛔ High Risk ⛔';
						break;
					case 5:
						similarityRiskLevel = '🚫 **Critical Risk** 🚫';
						break;
				}

				similarityScoreResultArray.push({
					userAddress,
					targetAddress,
					similarityRiskLevel,
				});
			}
		}
	}
	return similarityScoreResultArray;
}
