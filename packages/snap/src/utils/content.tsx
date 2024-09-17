import type { SnapComponent } from '@metamask/snaps-sdk/jsx';
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

export const onHomePageContent: SnapComponent = () => {
	return (
		<Box>
			<Heading>HashDit Snap</Heading>
			<Form name="example-form">
				<Text>
					Explore the power of HashDit Security and fortify your
					MetaMask experience. Navigate the crypto space with
					confidence.
				</Text>
				<Divider />
				<Heading>Notification Settings</Heading>
				<Dropdown name="example-dropdown">
					<Option value="Off">Off</Option>
					<Option value="option1">Every Day</Option>
					<Option value="option2">Every Week</Option>
					<Option value="option3">Every Month</Option>
				</Dropdown>
				<Button type="submit" name="submit">
					Save
				</Button>
				<Field label="Example RadioGroup">
					<RadioGroup name="example-radiogroup">
						<Radio value="option1">Option 1</Radio>
						<Radio value="option2">Option 2</Radio>
						<Radio value="option3">Option 3</Radio>
					</RadioGroup>
				</Field>
				<Field label="Example Selector">
					<Selector
						name="example-selector"
						title="Choose an option"
						value="option1"
					>
						<SelectorOption value="option1">
							<Card title="Option 1" value="option1" />
						</SelectorOption>
						<SelectorOption value="option2">
							<Card title="Option 2" value="option2" />
						</SelectorOption>
						<SelectorOption value="option3">
							<Card title="Option 3" value="option3" />
						</SelectorOption>
					</Selector>
				</Field>
				<Divider />
				<Heading>🔗 Links</Heading>
				<Text>
					Please help improve HashDit Snap by taking our 1 minute
					survey:{' '}
					<Link href="https://forms.gle/fgjAgVjUSyjuDS5BA">
						Survey
					</Link>
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
					<Link href="https://hashdit.gitbook.io/hashdit-snap">
						Docs
					</Link>
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
			</Form>
		</Box>
	);
};
