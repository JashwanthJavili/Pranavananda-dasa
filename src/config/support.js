// Where "Need help" requests are emailed. Every request is also saved in Firestore
// (BhagavadGita/data/helpRequests) and shown to admins, so email is a notification only.
//
// Sent through FormSubmit (https://formsubmit.co, free, no backend). SUPPORT_EMAIL is the
// activated FormSubmit inbox and always receives every request; Super Admins can add more
// addresses in Settings, which receive a copy (CC).
export const SUPPORT_EMAIL = 'jashwanthjavili7@gmail.com';
export const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${SUPPORT_EMAIL}`;

export const HELP_CATEGORIES = [
  'Not receiving the verification email',
  'Unable to log in',
  'Forgot password / reset not working',
  'Problem with first-time setup',
  'Edit my profile details',
  'My registration details are wrong',
  'WhatsApp community link',
  'Quizzes',
  'Something else',
];

export const HELP_STATUSES = ['Open', 'In Progress', 'Resolved'];
