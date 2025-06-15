/* eslint-disable */

import {
	Box,
	Heading,
	Text,
	Divider,
	Row,
	Address,
	Section,
	Tooltip,
	Avatar,
	Banner,
} from '@metamask/snaps-sdk/jsx';
import { toChecksumAddress } from '../utils/utilFunctions';


// Perform similarity score to detect address poisoning attacks
export function addressPoisoningDetection(
	userAddresses: string[],
	targetAddresses: string[],
) {
	let similarityResult = detectSimilarity(userAddresses, targetAddresses);
	if (similarityResult.length > 0) {
		return [
			<Box>
				       
				{similarityResult.map((result, index) => (
					<Box key={`address-poisoning-${index}`}>
						<Row label="Risk Level" variant="critical">
							<Text>{result.similarityRiskLevel || ''}</Text>
						</Row>
						<Row label="Your Address">
							<Address
								address={result.userAddress as `0x${string}`}
							/>
						</Row>
						<Row label="Fake Address">
							<Address
								address={result.targetAddress as `0x${string}`}
							/>
						</Row>

						{index !== similarityResult.length - 1 && <Divider />}
					</Box>
				))}
				

				<Text color="muted">
					⚠️ Warning: You are about to interact with an address that
					looks very similar to one of your own addresses. This is a
					common scam technique called "address poisoning" where
					scammers create addresses that look similar to yours to
					trick you into sending funds to the wrong address. Please
					double-check the address carefully before proceeding.
				</Text>
			</Box>
		,4]
	}
	return [null, 0];
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
						similarityRiskLevel = '🚫 High Risk';
						break;
					case 4:
						similarityRiskLevel = '🚫 High Risk';
						break;
					case 5:
						similarityRiskLevel = '🚫 Critical Risk';
						break;
				}

				similarityScoreResultArray.push({
					userAddress: toChecksumAddress(userAddress),
					targetAddress: toChecksumAddress(targetAddress),
					similarityRiskLevel,
				});
			}
		}
	}
	return similarityScoreResultArray;
}
