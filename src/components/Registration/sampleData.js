// Random devotional sample data for quickly filling the registration form while testing.
import { APP_ENV } from '../../config/firebaseConfig';

// Only offered on local dev and the staging build, never in the production build.
export const SAMPLE_FILL_ENABLED = import.meta.env.DEV || APP_ENV === 'staging';

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');

const MALE = ['Krishna', 'Arjun', 'Govind', 'Madhav', 'Keshav', 'Hari', 'Gopal', 'Mohan'];
const FEMALE = ['Radha', 'Lalita', 'Vishakha', 'Subhadra', 'Tulasi', 'Meera', 'Gauri', 'Sita'];
const SURNAMES = ['Das', 'Sharma', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Rao', 'Patel'];
const EDUCATION = ['B.Tech', 'B.Com', 'MBA', 'B.Sc', 'M.Sc', 'BA', 'Diploma'];
const OCCUPATIONS = ['Student', 'Working Professional', 'Homemaker', 'Business / Self-employed'];
const SOURCES = ['Yuva setu', 'Friends', 'Social media'];
const CITIES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Pune', 'Vijayawada', 'Mumbai'];
const STREETS = ['Temple Road', 'Gandhi Nagar', 'MG Road', 'Lakshmi Colony', 'Rama Street'];

const QUESTIONS = [
  'How can I stay steady in devotion while handling the pressures of work and life?',
  'How do I practice detachment from results without losing enthusiasm?',
  'What is the best way to begin a daily routine of Gita study and japa?',
];
const INSPIRATIONS = [
  'I want to understand the Bhagavad Gita deeply and apply its teachings to my daily life.',
  'A friend shared how the Gita brought peace to their life, and I felt inspired to learn.',
  'I am seeking clarity and purpose, and I hope to learn from Pranavananda Prabhu.',
];
const TAKEAWAYS = [
  'I hope to build a steady spiritual practice and a calmer, more focused mind.',
  'I aspire to serve others selflessly and live by Krishna\'s teachings.',
  'I wish to gain clarity on my duty and grow in devotion.',
];

export function generateSampleData() {
  const gender = pick(['Male', 'Female']);
  const first = pick(gender === 'Male' ? MALE : FEMALE);
  const last = pick(SURNAMES);
  const occupation = pick(OCCUPATIONS);
  const stamp = Date.now().toString().slice(-6);

  return {
    fullName: `${first} ${last}`,
    age: String(18 + Math.floor(Math.random() * 13)),
    gender,
    education: pick(EDUCATION),
    otherEducation: '',
    occupation,
    otherOccupation: '',
    countryCode: '+91',
    mobile: `${pick(['6', '7', '8', '9'])}${digits(9)}`,
    email: `${first}.${last}.${stamp}@example.com`.toLowerCase(),
    currentResidence: pick(CITIES),
    fullAddress: `${Math.floor(1 + Math.random() * 99)}, ${pick(STREETS)}`,
    pincode: `5${digits(5)}`,
    questionForPranavanandaPrabhu: pick(QUESTIONS),
    inspirationToJoin: pick(INSPIRATIONS),
    takeawayAspiration: pick(TAKEAWAYS),
    sourceOfDiscovery: pick(SOURCES),
    sourceOfDiscoveryOther: '',
  };
}
