// Contact Us messages are saved in Firestore (BhagavadGita/data/helpRequests) and shown to
// admins; email is a notification only. The addresses are chosen by Super Admins in Settings.
//
// Sent through FormSubmit (https://formsubmit.co, free, no backend): the first address is the
// FormSubmit inbox (it must confirm a one-time activation email), the others receive a copy (CC).
export const formSubmitEndpoint = (email) => `https://formsubmit.co/ajax/${encodeURIComponent(email)}`;

export const HELP_CATEGORIES = [
  'Unable to sign in',
  'Forgot password / reset not working',
  'Problem with sign up',
  'Edit my profile details',
  'My registration details are wrong',
  'WhatsApp community link',
  'Quizzes',
  'Others',
];

export const HELP_STATUSES = ['Open', 'In Progress', 'Resolved'];
