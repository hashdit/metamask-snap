/* eslint-disable */
import {
	heading,
	panel,
	text,
	divider,
	address,
	row,
	UnauthorizedError,
	MethodNotFoundError,
	NotificationType,
} from '@metamask/snaps-sdk';
import {
	Box,
	Heading,
	Text,
	Divider,
	Address,
	Row,
	Link,
	Container,
	Footer,
	Button,
	Section,
	Value,
	Bold,
	Card,
	Tooltip,
} from '@metamask/snaps-sdk/jsx';

export const onHomePageContent = (
	<Box>
		<Heading>HashDit Snap</Heading>
		<Text>
			Explore the power of HashDit Security and fortify your MetaMask
			experience. Navigate the crypto space with confidence.
		</Text>
		<Divider />
		<Section>
			<Heading>🔗 Links</Heading>
			<Text>
				Please help improve HashDit Snap by taking our 1 minute survey:{' '}
				<Link href="https://forms.gle/fgjAgVjUSyjuDS5BA">Survey</Link>
			</Text>
			<Text>
				HashDit Snap Official Website:{' '}
				<Link href="https://www.hashdit.io/snap">Hashdit</Link>
			</Text>
			<Text>
				Installation Guide:{' '}
				<Link href="https://hashdit.gitbook.io/hashdit-snap/usage/installing-hashdit-snap">
					Installation
				</Link>
			</Text>
			<Text>
				How To Use Hashdit Snap:{' '}
				<Link href="https://hashdit.gitbook.io/hashdit-snap/usage/how-to-use-hashdit-snap">
					Usage
				</Link>
			</Text>
			<Text>
				Documentation:{' '}
				<Link href="https://hashdit.gitbook.io/hashdit-snap">Docs</Link>
			</Text>
			<Text>
				FAQ/Knowledge Base:{' '}
				<Link href="https://hashdit.gitbook.io/hashdit-snap/information/faq-and-knowledge-base">
					FAQ
				</Link>
			</Text>
			<Text>
				MetaMask Store Page:{' '}
				<Link href="https://snaps.metamask.io/snap/npm/hashdit-snap-security/">
					Snap Store
				</Link>
			</Text>
		</Section>
		<Heading>Thank you for using HashDit Snap!</Heading>
	</Box>
);

export const onInstallContent = (
	<Box>
		<Section>
			<Heading>🛠️ Next Steps For Your Installation</Heading>
			<Text>
				<Bold>Step 1</Bold>
			</Text>
			<Text>
				To ensure the most secure experience, please connect all your
				MetaMask accounts with the HashDit Snap.
			</Text>
			<Text>
				<Bold>Step 2</Bold>
			</Text>
			<Text>
				Sign the Hashdit Security message request. This is required to
				enable the HashDit API to enable a complete experience.
			</Text>
			<Divider />
			<Heading>🔗 Links</Heading>
			<Text>
				Please help improve HashDit Snap by taking our 1 minute survey:{' '}
				<Link href="https://forms.gle/fgjAgVjUSyjuDS5BA">Survey</Link>
			</Text>
			<Text>
				HashDit Snap Official Website:{' '}
				<Link href="https://www.hashdit.io/snap">Hashdit</Link>
			</Text>
			<Text>
				Installation Guide:{' '}
				<Link href="https://hashdit.gitbook.io/hashdit-snap/usage/installing-hashdit-snap">
					Installation
				</Link>
			</Text>
			<Text>
				How To Use Hashdit Snap:{' '}
				<Link href="https://hashdit.gitbook.io/hashdit-snap/usage/how-to-use-hashdit-snap">
					Usage
				</Link>
			</Text>
			<Text>
				Documentation:{' '}
				<Link href="https://hashdit.gitbook.io/hashdit-snap">Docs</Link>
			</Text>
			<Text>
				FAQ/Knowledge Base:{' '}
				<Link href="https://hashdit.gitbook.io/hashdit-snap/information/faq-and-knowledge-base">
					FAQ
				</Link>
			</Text>
			<Text>
				MetaMask Store Page:{' '}
				<Link href="https://snaps.metamask.io/snap/npm/hashdit-snap-security/">
					Snap Store
				</Link>
			</Text>
			<Divider />
			<Heading>Thank you for using HashDit Snap!</Heading>
		</Section>
	</Box>
);

export const errorContent = (
	<Box>
		<Heading>HashDit Snap</Heading>
		<Section>
			<Text>
				An error occurred while retrieving the risk details for this
				transaction. If the issue persists, please try reinstalling
				HashDit Snap and try again.
			</Text>
		</Section>
	</Box>
);

export const notSupportedChainContent = (
	<Box>
		<Heading>HashDit Security Insights</Heading>
		<Section>
			<Text>
				Sorry! This blockchain network is not currently supported by
				HashDit Security Insights. Full security analysis is available
				for <Bold>Ethereum</Bold> and <Bold>Binance Smart Chain</Bold>{' '}
				networks.
			</Text>
		</Section>
	</Box>
);
