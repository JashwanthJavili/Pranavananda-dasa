import React, { useState } from 'react';
import {
  Palette, Power, ShieldCheck, KeyRound, Database, MessageCircle, BellRing, Share2, Lock, ScrollText,
  AlertTriangle, ChevronRight, ChevronLeft, Info, X, Settings,
} from 'lucide-react';

// Every setting in the admin Settings tab: where it sits, a one-line summary, and an explanation.
export const SETTINGS_GROUPS = [
  {
    title: 'Website',
    items: [
      {
        key: 'branding', Icon: Palette, title: 'Header & branding', summary: 'Course name, tagline and title size',
        info: 'Changes the course name and the small tagline shown at the top of the website, and how big the name appears. '
          + 'The preview shows how it will look. "Reset Defaults" only fills the form with the original values; nothing changes on the website until you press "Save Branding".',
      },
      {
        key: 'registration', Icon: Power, title: 'Registration & waiting room', summary: 'Landing page, open or pause registrations, queue',
        info: 'Landing Page Mode: "Full Landing Page" shows the welcome page first; "Direct Registration" takes visitors straight to the form. '
          + 'Enable Registration Form: "Paused" stops new registrations and shows your notice message instead (you are asked to confirm). '
          + 'Waiting room: when many people register at once, turn on Queue Mode so visitors wait a few seconds (the time you choose) before the form opens. Press each Save button to apply.',
      },
    ],
  },
  {
    title: 'Messages & community',
    items: [
      {
        key: 'whatsapp', Icon: MessageCircle, title: 'WhatsApp community', summary: 'Group link devotees can join',
        info: 'Turns the "Join WhatsApp community" button on or off for devotees (you are asked to confirm), and sets the group link it opens and the text on the button. '
          + 'You can also hide the button for devotees who heard about us through particular sources.',
      },
      {
        key: 'contactEmails', Icon: BellRing, title: 'Contact Us emails', summary: 'Who gets an email for each message',
        info: 'When a devotee sends a message through Contact Us, an email goes to every address in this list (the first one is the main inbox). '
          + 'The first message to a new main inbox sends an activation email from FormSubmit; click "Activate Form" in it once. Messages are always saved in the Contact Us tab as well.',
      },
      {
        key: 'social', Icon: Share2, title: 'Social media links', summary: 'Instagram and YouTube on quiz results',
        info: 'The Instagram and YouTube links devotees see on their quiz results ("Stay connected"). Only real instagram.com and youtube.com links are accepted.',
      },
    ],
  },
  {
    title: 'Team & security',
    items: [
      {
        key: 'team', Icon: ShieldCheck, title: 'Admins & roles', summary: 'Add admins, reset passwords, revoke access',
        info: 'Give a coordinator access by adding their email, name, password and role. An Admin can see registrations, Contact Us and ratings; '
          + 'a Super Admin can also manage quizzes and these settings. Use "Reset Password" if someone forgot theirs, and "Revoke" to remove access.',
      },
      {
        key: 'password', Icon: KeyRound, title: 'My password', summary: 'Change your own login password',
        info: 'Change the password you use to log in to this admin dashboard. Enter your current password once and the new one twice. Other admins are not affected.',
      },
    ],
  },
  {
    title: 'Data',
    items: [
      {
        key: 'backup', Icon: Database, title: 'Backup & export', summary: 'Download registrations as Excel or a full backup',
        info: 'Excel downloads all registrations as a spreadsheet. The JSON snapshot is a complete backup of the registration data, useful to keep safely offline. '
          + 'Downloading does not change anything on the website.',
      },
      {
        key: 'protection', Icon: Lock, title: 'Data protection', summary: 'Allow or block deleting registrations',
        info: 'Off (recommended): the delete icon is hidden in the registration table and the database refuses any delete. '
          + 'Turn it on only when a registration really must be removed, then turn it off again. Deleted registrations are only hidden, never erased.',
      },
      {
        key: 'deletionLog', Icon: ScrollText, title: 'Deletion log', summary: 'Who deleted which registration, and when',
        info: 'A permanent record of every registration that was deleted: who deleted it, when and why. Entries can never be edited or removed.',
      },
    ],
  },
  {
    title: 'Testing',
    stagingOnly: true,
    items: [
      {
        key: 'stagingWipe', Icon: AlertTriangle, title: 'Danger zone', summary: 'Wipe test data (staging site only)',
        info: 'Only on the staging (test) site, never on the live site. Deletes the test participants, accounts, quiz answers and messages so testing can start fresh. Admins and settings are kept.',
      },
    ],
  },
];

export const findSetting = (key) => SETTINGS_GROUPS.flatMap((g) => g.items).find((i) => i.key === key) || null;

function InfoText({ text, onClose }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-sky-50 border border-sky-200 px-3 py-2.5 text-xs text-sky-950 leading-relaxed animate-fadeIn">
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-sky-600" />
      <p className="flex-1">{text}</p>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close explanation" className="p-0.5 rounded text-sky-700 hover:bg-sky-100 cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function InfoButton({ open, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
        open ? 'bg-sky-100 text-sky-700' : 'text-temple-400 hover:text-sky-700 hover:bg-sky-50'
      }`}
    >
      <Info className="w-4 h-4" />
    </button>
  );
}

/** The list of settings, grouped. */
export function SettingsMenu({ active, onOpen, showStaging }) {
  const [infoOpen, setInfoOpen] = useState(null);
  return (
    <nav aria-label="Settings" className="space-y-4">
      {SETTINGS_GROUPS.filter((g) => !g.stagingOnly || showStaging).map((group) => (
        <div key={group.title} className="space-y-1.5">
          <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-temple-400">{group.title}</p>
          <div className="rounded-2xl bg-white border border-cream-200 shadow-2xs divide-y divide-cream-100 overflow-hidden">
            {group.items.map((item) => {
              const on = active === item.key;
              return (
                <div key={item.key} className={on ? 'bg-saffron-50/70' : ''}>
                  <div className="flex items-center gap-1 pr-2">
                    <button
                      type="button"
                      onClick={() => onOpen(item.key)}
                      aria-current={on ? 'page' : undefined}
                      className="flex-1 min-w-0 flex items-center gap-3 pl-3 py-3 text-left cursor-pointer"
                    >
                      <span className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center ${
                        item.key === 'stagingWipe'
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : on ? 'bg-saffron-500 border-saffron-500 text-white' : 'bg-saffron-50 border-saffron-100 text-saffron-600'
                      }`}
                      >
                        <item.Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm font-semibold truncate ${on ? 'text-saffron-800' : 'text-temple-900'}`}>{item.title}</span>
                        <span className="block text-[11px] text-temple-500 truncate">{item.summary}</span>
                      </span>
                    </button>
                    <InfoButton
                      open={infoOpen === item.key}
                      onClick={() => setInfoOpen(infoOpen === item.key ? null : item.key)}
                      label={`About ${item.title}`}
                    />
                    <ChevronRight className="w-4 h-4 shrink-0 text-temple-300" />
                  </div>
                  {infoOpen === item.key && (
                    <div className="px-3 pb-3">
                      <InfoText text={item.info} onClose={() => setInfoOpen(null)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Bar above an open setting: back to the list (phones) and its explanation. */
export function SettingsPanelBar({ settingKey, onBack }) {
  const item = findSetting(settingKey);
  const [open, setOpen] = useState(false);
  if (!item) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-cream-300 bg-white text-xs font-semibold text-temple-700 hover:bg-cream-100 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> All settings
        </button>
        <p className="hidden lg:flex items-center gap-1.5 text-xs text-temple-500">
          <Settings className="w-3.5 h-3.5" /> Settings <ChevronRight className="w-3 h-3" />
          <span className="font-semibold text-temple-800">{item.title}</span>
        </p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
            open ? 'bg-sky-100 border-sky-200 text-sky-800' : 'bg-white border-cream-300 text-temple-600 hover:text-sky-700'
          }`}
        >
          <Info className="w-3.5 h-3.5" /> About this setting
        </button>
      </div>
      {open && <InfoText text={item.info} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Shown on wide screens before a setting is chosen. */
export function SettingsPlaceholder() {
  return (
    <div className="rounded-3xl border border-dashed border-cream-300 bg-cream-50/60 p-10 text-center space-y-2">
      <Settings className="w-8 h-8 mx-auto text-temple-300" />
      <p className="text-sm font-semibold text-temple-700">Choose a setting on the left</p>
      <p className="text-xs text-temple-500">Tap the <Info className="inline w-3.5 h-3.5 -mt-0.5" /> next to any setting to learn what it does.</p>
    </div>
  );
}
