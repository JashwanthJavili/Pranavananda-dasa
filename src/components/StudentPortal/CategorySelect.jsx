import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown, Check, MailWarning, LogIn, KeyRound, UserCog, UserPen, FileWarning, MessageCircle, BookOpen, HelpCircle,
} from 'lucide-react';

// Icon + short hint for each help category (keys match HELP_CATEGORIES in config/support.js).
const META = {
  'Not receiving the verification email': { Icon: MailWarning, hint: 'The setup email did not arrive' },
  'Unable to log in': { Icon: LogIn, hint: 'Email / mobile and password not working' },
  'Forgot password / reset not working': { Icon: KeyRound, hint: 'Reset link missing or not working' },
  'Problem with first-time setup': { Icon: UserCog, hint: 'Stuck while creating your account' },
  'Edit my profile details': { Icon: UserPen, hint: 'Change your name, mobile, email or other details' },
  'My registration details are wrong': { Icon: FileWarning, hint: 'Something in your registration is incorrect' },
  'WhatsApp community link': { Icon: MessageCircle, hint: 'Cannot see or join the group' },
  Quizzes: { Icon: BookOpen, hint: 'Questions about quizzes' },
  'Something else': { Icon: HelpCircle, hint: 'Anything not listed above' },
};
const metaFor = (option) => META[option] || { Icon: HelpCircle, hint: '' };

/** Accessible custom dropdown (listbox) for choosing the help category. */
export default function CategorySelect({ id, labelId, value, onChange, options, placeholder = 'Choose an option', invalid }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const openList = () => {
    const i = options.indexOf(value);
    setActive(i >= 0 ? i : 0);
    setOpen(true);
  };

  const choose = (option) => {
    onChange(option);
    setOpen(false);
    buttonRef.current?.focus();
  };

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // Keep the highlighted option in view and focus the list when it opens.
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onButtonKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[active]); }
    else if (e.key === 'Escape') {
      // Close only the list, not the whole help dialog.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'Tab') setOpen(false);
  };

  const selected = value ? metaFor(value) : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${id}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKey}
        className={`w-full flex items-center gap-3 pl-3 pr-3.5 py-2.5 rounded-xl bg-white border text-left text-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-saffron-400/50 ${
          open ? 'border-saffron-300 ring-2 ring-saffron-400/30' : invalid ? 'border-red-300' : 'border-cream-300 hover:border-gold-300'
        }`}
      >
        {selected ? (
          <>
            <span className="shrink-0 w-8 h-8 rounded-lg bg-saffron-50 border border-saffron-200 flex items-center justify-center text-saffron-700">
              <selected.Icon className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0 font-medium text-temple-900 truncate">{value}</span>
          </>
        ) : (
          <>
            <span className="shrink-0 w-8 h-8 rounded-lg bg-cream-100 border border-cream-200 flex items-center justify-center text-temple-400">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="flex-1 text-temple-400">{placeholder}</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 shrink-0 text-temple-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onListKey}
          className="absolute z-20 mt-2 w-full max-h-72 overflow-y-auto rounded-2xl bg-white border border-cream-200 shadow-soft-lg p-1.5 focus:outline-none animate-fadeIn"
        >
          {options.map((option, i) => {
            const { Icon, hint } = metaFor(option);
            const isSelected = option === value;
            const isActive = i === active;
            return (
              <li
                key={option}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  isActive ? 'bg-saffron-50' : ''
                }`}
              >
                <span
                  className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${
                    isSelected ? 'bg-saffron-500 border-saffron-500 text-white' : 'bg-cream-50 border-cream-200 text-saffron-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm leading-snug ${isSelected ? 'font-semibold text-saffron-800' : 'font-medium text-temple-900'}`}>{option}</span>
                  {hint && <span className="block text-[11px] text-temple-500 leading-snug">{hint}</span>}
                </span>
                {isSelected && <Check className="w-4 h-4 shrink-0 text-saffron-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
