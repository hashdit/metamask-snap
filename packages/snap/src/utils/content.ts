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

export const onInstallContent = [
	heading('🛠️ Next Steps For Your Installation'),
	text('**Step 1**'),
	text(
		' To ensure the most secure experience, please connect all your MetaMask accounts with the HashDit Snap.',
	),
	text('**Step 2**'),
	text(
		'Sign the Hashdit Security message request. This is required to enable the HashDit API to enable a complete experience.',
	),
	divider(),
	heading('🔗 Links'),
	text(
		'Please help improve HashDit Snap by taking our 1 minute survey: [Survey](https://forms.gle/fgjAgVjUSyjuDS5BA)',
	),
	text(
		'HashDit Snap Official Website: [Hashdit](https://www.hashdit.io/en/snap)',
	),
	text(
		'Installation Guide: [Installation](https://hashdit.gitbook.io/hashdit-snap/usage/installing-hashdit-snap)',
	),
	text(
		'How To Use Hashdit Snap: [Usage](https://hashdit.gitbook.io/hashdit-snap/usage/how-to-use-hashdit-snap)',
	),
	text('Documentation: [Docs](https://hashdit.gitbook.io/hashdit-snap)'),
	text(
		'FAQ/Knowledge Base: [FAQ](https://hashdit.gitbook.io/hashdit-snap/information/faq-and-knowledge-base)',
	),
	text(
		'MetaMask Store Page: [Snap Store](https://snaps.metamask.io/snap/npm/hashdit-snap-security/)',
	),
	divider(),
	heading('Thank you for using HashDit Snap!'),
];

export const onHomePageContent = [
	heading('HashDit Snap'),
	text(
		'Explore the power of HashDit Security and fortify your MetaMask experience. Navigate the crypto space with confidence.',
	),
	divider(),
	heading('🔗 Links'),
	text(
		'Please help improve HashDit Snap by taking our 1 minute survey: [Survey](https://forms.gle/fgjAgVjUSyjuDS5BA)',
	),
	text(
		'HashDit Snap Official Website: [Hashdit](https://www.hashdit.io/en/snap)',
	),
	text(
		'Installation Guide: [Installation](https://hashdit.gitbook.io/hashdit-snap/usage/installing-hashdit-snap)',
	),
	text(
		'How To Use Hashdit Snap: [Usage](https://hashdit.gitbook.io/hashdit-snap/usage/how-to-use-hashdit-snap)',
	),
	text('Documentation: [Docs](https://hashdit.gitbook.io/hashdit-snap)'),
	text(
		'FAQ/Knowledge Base: [FAQ](https://hashdit.gitbook.io/hashdit-snap/information/faq-and-knowledge-base)',
	),
	text(
		'MetaMask Store Page: [Snap Store](https://snaps.metamask.io/snap/npm/hashdit-snap-security/)',
	),
	divider(),
	heading('Thank you for using HashDit Snap!'),
];
