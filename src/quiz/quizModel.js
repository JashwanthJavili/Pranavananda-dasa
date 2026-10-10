// Weekly quiz: shared, framework-free helpers used by the student portal and the admin.
//
// Firestore layout (all root-level, so the open BhagavadGita/data rules never apply):
//   portalQuizzes/{quizId}                 what students see: questions and options, NO answers
//   portalQuizKeys/{quizId}                correct answers (quiz managers; students only once results are due)
//   quizProgress/{quizId}_{regId}          one per student per quiz: attempt count (absent = Not Attempted)
//   quizAttempts/{quizId}_{regId}_{n}      each submitted attempt: answers only, create-only
// Scores are never stored by students: they are always computed from the answers and the key.
//
// Question types (like Google Forms):
//   short      one line of text      key: accepted answers [] (optional; empty = not marked)
//   paragraph  long text             never auto-marked
//   mcq        multiple choice       key: the one correct option id
//   checkbox   tick all that apply   key: every correct option id []
// Student answers: short / paragraph -> text, mcq -> option id, checkbox -> [option ids].

export const QUESTION_TYPES = {
  short: { label: 'Short answer', hint: 'One line of text' },
  paragraph: { label: 'Long answer', hint: 'A few sentences' },
  mcq: { label: 'Multiple choice', hint: 'Pick one option' },
  checkbox: { label: 'Checkboxes', hint: 'Pick all that apply' },
};
export const TYPE_ORDER = ['short', 'paragraph', 'mcq', 'checkbox'];
export const SHORT_MAX = 150;
export const PARAGRAPH_MAX = 2000;
export const MAX_QUESTIONS = 100;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;
export const MAX_ATTEMPTS_LIMIT = 5;
export const SCORE_POLICIES = { best: 'Best attempt counts', latest: 'Latest attempt counts' };

export const hasOptions = (type) => type === 'mcq' || type === 'checkbox';
export const textLimit = (type) => (type === 'paragraph' ? PARAGRAPH_MAX : SHORT_MAX);

export const progressId = (quizId, registrationId) => `${quizId}_${registrationId}`;
export const attemptId = (quizId, registrationId, n) => `${quizId}_${registrationId}_${n}`;

export const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d) ? null : d;
};

export const formatWhen = (v) => {
  const d = toDate(v);
  return d
    ? d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      .replace(/\b(am|pm)\b/i, (s) => s.toUpperCase())
    : '';
};

export const quizLabel = (q) => (q?.weekNumber ? `Week ${q.weekNumber}` : '') || q?.title || 'Quiz';

const randomId = () => Math.random().toString(36).slice(2, 10);
export const newQuestionId = () => `q_${randomId()}`;
export const newOptionId = () => `o_${randomId()}`;

/**
 * Availability of a published quiz right now.
 * Returns 'upcoming' | 'open' | 'closed'.
 */
export function availability(quiz, now = new Date()) {
  const opens = toDate(quiz?.opensAt);
  const closes = toDate(quiz?.closesAt);
  if (opens && now < opens) return 'upcoming';
  if (closes && now > closes) return 'closed';
  return 'open';
}

// ---------------------------------------------------------------------------
// Answers and marking
// ---------------------------------------------------------------------------

const normalizeText = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

export function isAnswered(value) {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim() !== '';
}

/** Indexes (0-based) of required questions that still have no answer. */
export function missingRequired(questions = [], answers = {}) {
  return questions.reduce((acc, q, i) => (q.required && !isAnswered(answers[q.id]) ? [...acc, i] : acc), []);
}

/** True when this question can be marked automatically with this key. */
export function isGraded(question, key = {}) {
  const k = key[question.id];
  // Written answers (short / long) are collected, not scored
  if (question.type === 'paragraph' || question.type === 'short') return false;
  if (question.type === 'checkbox') return Array.isArray(k) && k.length > 0;
  return typeof k === 'string' && k !== ''; // mcq (and older quizzes without a type)
}

/** 'correct' | 'incorrect' | 'unanswered' | 'ungraded' for one question. */
export function markQuestion(question, value, key = {}) {
  if (!isGraded(question, key)) return 'ungraded';
  if (!isAnswered(value)) return 'unanswered';
  const k = key[question.id];
  let ok = false;
  if (question.type === 'short') ok = k.some((a) => normalizeText(a) === normalizeText(value));
  else if (question.type === 'checkbox') {
    const mine = Array.isArray(value) ? [...new Set(value)].sort() : [];
    const right = [...new Set(k)].sort();
    ok = mine.length === right.length && mine.every((v, i) => v === right[i]);
  } else ok = value === k;
  return ok ? 'correct' : 'incorrect';
}

/** Score one attempt against the key. Only auto-marked questions count towards the total. */
export function scoreAnswers(questions = [], answers = {}, key = {}) {
  let correct = 0;
  let total = 0;
  questions.forEach((q) => {
    const m = markQuestion(q, answers[q.id], key);
    if (m === 'ungraded') return;
    total += 1;
    if (m === 'correct') correct += 1;
  });
  return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
}

/** The attempt that counts under the quiz's policy ('best' | 'latest'). */
export function countedAttempt(scoredAttempts = [], policy = 'best') {
  if (!scoredAttempts.length) return null;
  const byNumber = [...scoredAttempts].sort((a, b) => a.attemptNumber - b.attemptNumber);
  if (policy === 'latest') return byNumber[byNumber.length - 1];
  return byNumber.reduce((best, a) => (a.score.correct > best.score.correct ? a : best), byNumber[0]);
}

/** Stopwatch text: 00:00, 04:32, 1:04:32 */
export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** Time taken in words: "45 sec", "4 min 32 sec", "1 hr 4 min" */
export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h} hr${m ? ` ${m} min` : ''}`;
  if (m) return `${m} min${s % 60 ? ` ${s % 60} sec` : ''}`;
  return `${s} sec`;
}

export function resultMessage(percent, total = 1) {
  if (!total) return { title: 'Submitted 🙏', text: 'Thank you for your thoughtful answers. May Krishna bless your sincere study.' };
  if (percent === 100) return { title: 'Perfect score! 🙏', text: 'Every answer correct. May Krishna bless your sincere study.' };
  if (percent >= 80) return { title: 'Wonderful! 🙏', text: 'You have understood this week’s teachings very well.' };
  if (percent >= 50) return { title: 'Well done 🙏', text: 'A good effort. Review the answers below to deepen your understanding.' };
  return { title: 'Keep going 🙏', text: 'Every step of study is valuable. Read through the correct answers below and revisit the verses.' };
}

/** Keep only answers that fit their question (type, option ids, length). */
export function cleanAnswers(questions = [], answers = {}) {
  const out = {};
  questions.forEach((q) => {
    const v = answers[q.id];
    if (!isAnswered(v)) return;
    const optionIds = new Set((q.options || []).map((o) => o.id));
    if (q.type === 'checkbox') {
      const picked = (Array.isArray(v) ? v : []).filter((id) => optionIds.has(id));
      if (picked.length) out[q.id] = [...new Set(picked)];
    } else if (q.type === 'short' || q.type === 'paragraph') {
      if (typeof v === 'string') out[q.id] = v.trim().slice(0, textLimit(q.type));
    } else if (typeof v === 'string' && optionIds.has(v)) {
      out[q.id] = v;
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Editor drafts <-> Firestore
// ---------------------------------------------------------------------------

export function emptyQuestion(type = 'mcq') {
  return {
    id: newQuestionId(),
    type,
    text: '',
    description: '',
    required: true,
    options: hasOptions(type) ? [{ id: newOptionId(), text: '' }, { id: newOptionId(), text: '' }] : [],
    // mcq: option id · checkbox: option ids · short: accepted answers as typed ("a, b")
    correct: type === 'checkbox' ? [] : '',
  };
}

/** Change a question's type, keeping whatever still makes sense. */
export function changeQuestionType(q, type) {
  if (q.type === type) return q;
  const options = hasOptions(type)
    ? (q.options?.length ? q.options : [{ id: newOptionId(), text: '' }, { id: newOptionId(), text: '' }])
    : [];
  let correct = type === 'checkbox' ? [] : '';
  if (type === 'checkbox' && q.type === 'mcq' && q.correct) correct = [q.correct];
  if (type === 'mcq' && q.type === 'checkbox' && q.correct?.length) correct = q.correct[0];
  return { ...q, type, options, correct };
}

export function emptyDraft() {
  return {
    title: '',
    weekNumber: '',
    description: '',
    instructions: 'Read each question carefully and answer to the best of your understanding. You can move between questions before submitting.',
    opensAt: null,
    closesAt: null,
    maxAttempts: 1,
    scorePolicy: 'best',
    questions: [],
  };
}

/** Merge the public quiz doc and its key into one editable draft. */
export function toDraft(quiz, key) {
  const answers = key?.answers || {};
  return {
    title: quiz.title || '',
    weekNumber: quiz.weekNumber ?? '',
    description: quiz.description || '',
    instructions: quiz.instructions || '',
    opensAt: toDate(quiz.opensAt),
    closesAt: toDate(quiz.closesAt),
    maxAttempts: quiz.maxAttempts || 1,
    scorePolicy: quiz.scorePolicy || 'best',
    questions: (quiz.questions || []).map((q) => {
      const type = q.type || 'mcq';
      const k = answers[q.id];
      return {
        id: q.id,
        type,
        text: q.text || '',
        description: q.description || '',
        required: Boolean(q.required),
        options: (q.options || []).map((o) => ({ id: o.id, text: o.text || '' })),
        correct: type === 'checkbox'
          ? (Array.isArray(k) ? k : [])
          : type === 'short'
            ? (Array.isArray(k) ? k.join(', ') : '')
            : (typeof k === 'string' ? k : ''),
      };
    }),
  };
}

const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanBlock = (s, max) => String(s ?? '').replace(/\r/g, '').trim().slice(0, max);

/** Accepted short answers typed as "Krishna, Lord Krishna". */
export const parseAccepted = (text) => String(text || '').split(',').map((a) => clean(a, SHORT_MAX)).filter(Boolean);

/**
 * Validate a draft. `forPublish` adds the checks needed before students can see it.
 * Returns { errors: string[], questionErrors: {[questionId]: string} }.
 */
export function validateDraft(draft, { forPublish = false } = {}) {
  const errors = [];
  const questionErrors = {};
  if (!clean(draft.title, 200)) errors.push('Please give the quiz a title.');
  const week = String(draft.weekNumber ?? '').trim();
  if (week && !/^\d{1,3}$/.test(week)) errors.push('Week number must be a whole number.');
  if (forPublish && !draft.questions?.length) errors.push('Add at least one question before publishing.');
  if (draft.questions?.length > MAX_QUESTIONS) errors.push(`A quiz can have at most ${MAX_QUESTIONS} questions.`);
  const opens = toDate(draft.opensAt);
  const closes = toDate(draft.closesAt);
  if (forPublish && !opens) errors.push('Please set when the quiz opens.');
  if (opens && closes && closes <= opens) errors.push('The closing time must be after the opening time.');
  const max = Number(draft.maxAttempts);
  if (!Number.isInteger(max) || max < 1 || max > MAX_ATTEMPTS_LIMIT) errors.push(`Attempts allowed must be between 1 and ${MAX_ATTEMPTS_LIMIT}.`);

  (draft.questions || []).forEach((q, i) => {
    let problem = '';
    if (!clean(q.text, 1000)) problem = 'Write the question.';
    else if (hasOptions(q.type)) {
      const filled = q.options.filter((o) => clean(o.text, 300));
      const texts = filled.map((o) => clean(o.text, 300).toLowerCase());
      if (filled.length < MIN_OPTIONS) problem = `Add at least ${MIN_OPTIONS} options.`;
      else if (new Set(texts).size !== texts.length) problem = 'Two options have the same text.';
      else if (q.type === 'mcq' && !filled.some((o) => o.id === q.correct)) problem = 'Mark the correct answer.';
      else if (q.type === 'checkbox' && !filled.some((o) => (q.correct || []).includes(o.id))) problem = 'Tick at least one correct answer.';
    }
    if (problem) questionErrors[q.id] = `Question ${i + 1}: ${problem}`;
  });
  if (Object.keys(questionErrors).length) errors.push(...Object.values(questionErrors));
  return { errors, questionErrors };
}

/** Split a draft into the public quiz fields and the private key. Empty options are dropped. */
export function fromDraft(draft) {
  const questions = draft.questions.map((q) => {
    const out = {
      id: q.id,
      type: q.type,
      text: cleanBlock(q.text, 1000),
      description: cleanBlock(q.description, 1000),
      required: Boolean(q.required),
    };
    if (hasOptions(q.type)) {
      out.options = q.options.filter((o) => clean(o.text, 300)).map((o) => ({ id: o.id, text: clean(o.text, 300) }));
    } else {
      out.maxLength = textLimit(q.type);
    }
    return out;
  });
  const answers = {};
  draft.questions.forEach((q) => {
    const kept = new Set(q.options.filter((o) => clean(o.text, 300)).map((o) => o.id));
    if (q.type === 'mcq' && kept.has(q.correct)) answers[q.id] = q.correct;
    if (q.type === 'checkbox') {
      const ids = (q.correct || []).filter((id) => kept.has(id));
      if (ids.length) answers[q.id] = ids;
    }
  });
  const week = String(draft.weekNumber ?? '').trim();
  return {
    quiz: {
      title: clean(draft.title, 200),
      weekNumber: week ? Number(week) : null,
      description: cleanBlock(draft.description, 1000),
      instructions: cleanBlock(draft.instructions, 2000),
      opensAt: toDate(draft.opensAt),
      closesAt: toDate(draft.closesAt),
      maxAttempts: Number(draft.maxAttempts) || 1,
      scorePolicy: draft.scorePolicy === 'latest' ? 'latest' : 'best',
      questions,
      questionCount: questions.length,
    },
    key: { answers },
  };
}
