// Social media links shown to students on their quiz results ("Stay connected").
// Set by Super Admins; stored at BhagavadGita/data/config/socialLinks.
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isSuperAdminUser } from './firebase';

export const SOCIAL_PLATFORMS = [
  { key: 'instagram', label: 'Instagram', action: 'Follow', hosts: ['instagram.com'], example: 'https://www.instagram.com/yourpage' },
  { key: 'youtube', label: 'YouTube', action: 'Subscribe', hosts: ['youtube.com', 'youtu.be'], example: 'https://www.youtube.com/@yourchannel' },
];

const linksRef = () => doc(db, 'BhagavadGita', 'data', 'config', 'socialLinks');

/** The link as a safe https URL on that platform's own website, or '' if it is not one. */
export function safeSocialUrl(platformKey, value) {
  const platform = SOCIAL_PLATFORMS.find((p) => p.key === platformKey);
  const text = String(value || '').trim();
  if (!platform || !text) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    const host = url.hostname.toLowerCase();
    const onPlatform = platform.hosts.some((h) => host === h || host.endsWith(`.${h}`));
    return url.protocol === 'https:' && onPlatform ? url.href : '';
  } catch (e) {
    return '';
  }
}

export const SOCIAL_NAME_MAX = 40;
/** Key of the name shown on a platform's button, e.g. "instagramName" -> "@gitaforyouth". */
export const nameKey = (platformKey) => `${platformKey}Name`;
const cleanName = (value) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, SOCIAL_NAME_MAX);

const cleanLinks = (data = {}) => Object.fromEntries(SOCIAL_PLATFORMS.flatMap((p) => [
  [p.key, safeSocialUrl(p.key, data[p.key])],
  [nameKey(p.key), cleanName(data[nameKey(p.key)])],
]));

/** { instagram, instagramName, youtube, youtubeName } with only valid links. */
export async function fetchSocialLinks() {
  const snap = await getDoc(linksRef());
  return cleanLinks(snap.exists() ? snap.data() : {});
}

export async function saveSocialLinks(links, callerUser) {
  if (!isSuperAdminUser(callerUser)) throw new Error('Only Super Admins can change the social media links.');
  const clean = cleanLinks(links);
  await setDoc(linksRef(), {
    ...clean,
    updatedBy: callerUser?.email || 'Super Admin',
    updatedAt: serverTimestamp(),
  });
  return clean;
}
