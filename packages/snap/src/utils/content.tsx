import {
	Box,
	Heading,
	Address,
	Text,
	Divider,
	Bold,
	Link,
	Dropdown,
	Option,
	Button,
	Field,
	Radio,
	RadioGroup,
	Selector,
	SelectorOption,
	Form,
} from '@metamask/snaps-sdk/jsx';

/**
 * The state of the {@link InteractiveForm} component.
 */
export type InteractiveFormState = {
	/**
	 * The value of the example dropdown.
	 */
	'example-dropdown': string;
};

export const onInstallContent = (
	<Box>
		<Heading>🛠️ Next Steps For Your Installation</Heading>
		<Text>
			<Bold>Step 1</Bold>
		</Text>
		<Text>
			To ensure the most secure experience, please connect{' '}
			<Bold>all</Bold> your MetaMask accounts with the HashDit Snap.
		</Text>
		<Text>Step 2</Text>
		<Text>
			Sign the Hashdit Security message request. This is{' '}
			<Bold>required</Bold> to enable the HashDit API to enable a complete
			experience.
		</Text>
		<Divider />
		<Heading>🔗 Links</Heading>
		<Text>
			Please help improve HashDit Snap by taking our 1 minute survey:{' '}
			<Link href="https://forms.gle/fgjAgVjUSyjuDS5BA">Survey</Link>
		</Text>
		<Text>
			HashDit Snap Official Website:{' '}
			<Link href="https://www.hashdit.io/en/snap">Hashdit</Link>
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
				How To Use
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
	</Box>
);

export const onHomePageContent = () => {
	return (
		<Box>
			<Heading>HashDit Snap</Heading>

			<Text>
				Explore the power of HashDit Security and fortify your MetaMask
				experience. Navigate the crypto space with confidence.
			</Text>
			<Divider />
			<Heading>Notification Settings</Heading>
			<Text>
				Change notifications settings on the HashDit Snap website:{' '}
				<Link href="https://www.hashdit.io/en/snap">Hashdit</Link>
			</Text>
			{/* <Form name="allApprovalsForm">
				<Text>All Token Approvals</Text>
				<Dropdown
					name="allApprovalsDropdown"
					value={allApprovalsDropdownValue}
				>
					<Option value="Off">Off</Option>
					<Option value="minute">Every Minute</Option>
					<Option value="daily">Every Day</Option>
					<Option value="weekly">Every Week</Option>
					<Option value="monthly">Every Month</Option>
				</Dropdown>
				<Button type="submit" name="submit">
					Save
				</Button>
			</Form>
			<Form name="riskyApprovalsForm">
				<Text>Risky Token Approvals</Text>
				<Dropdown
					name="riskyApprovalsDropdown"
					value={riskyApprovalsDropdownValue}
				>
					<Option value="Off">Off</Option>
					<Option value="option1">Every Day</Option>
					<Option value="option2">Every Week</Option>
					<Option value="option3">Every Month</Option>
				</Dropdown>
				<Button type="submit" name="submit">
					Save
				</Button>
			</Form> */}

			<Divider />
			<Heading>🔗 Links</Heading>
			<Text>
				Please help improve HashDit Snap by taking our 1 minute survey:{' '}
				<Link href="https://forms.gle/fgjAgVjUSyjuDS5BA">Survey</Link>
			</Text>
			<Text>
				HashDit Snap Official Website:{' '}
				<Link href="https://www.hashdit.io/en/snap">Hashdit</Link>
			</Text>
			<Text>
				Installation Guide:{' '}
				<Link href="https://hashdit.gitbook.io/hashdit-snap/usage/installing-hashdit-snap">
					Installation
				</Link>
			</Text>
			<Text>
				How To Use HashDit Snap:{' '}
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
		</Box>
	);
};
