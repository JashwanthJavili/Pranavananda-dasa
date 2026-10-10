// One Excel workbook per quiz for Super Admins: every participant with their status, score,
// time and answers, plus a summary, per-question statistics and (with retakes) every attempt.
import {
  QUESTION_TYPES, hasOptions, markQuestion, isGraded, formatWhen, formatDuration, quizLabel,
} from './quizModel';

const RESULT_TEXT = { correct: 'Correct', incorrect: 'Incorrect', unanswered: 'Not answered', ungraded: 'Written' };
const resultText = (q, value, key) => {
  const m = markQuestion(q, value, key);
  return m === 'ungraded' && (value === undefined || value === '') ? 'Not answered' : RESULT_TEXT[m];
};

/** A student's answer as readable text (option texts instead of ids). */
function answerText(q, value) {
  if (value === undefined || value === null || value === '') return '';
  if (!hasOptions(q.type || 'mcq')) return String(value);
  const byId = Object.fromEntries((q.options || []).map((o) => [o.id, o.text]));
  const ids = Array.isArray(value) ? value : [value];
  return ids.map((id) => byId[id] ?? '').filter(Boolean).join('; ');
}

function correctText(q, key) {
  if (!isGraded(q, key)) return '';
  return answerText(q, key[q.id]);
}

const regIdOf = (p) => p.registrationId || p.id || '';
// Column headings carry the question itself, e.g. "Q1. Who spoke the Gita?"
const answerHeading = (q, i) => {
  const text = String(q.text || '').replace(/\s+/g, ' ').trim();
  return `Q${i + 1}. ${text.length > 90 ? `${text.slice(0, 89)}…` : text}`;
};
const resultHeading = (i) => `Q${i + 1} Result`;
const when = (t) => (t ? formatWhen(t) : '');
const duration = (sec) => (Number.isFinite(sec) ? formatDuration(sec) : '');
const pct = (s) => (s?.total ? `${s.percent}%` : '');

function fileName(quiz) {
  const base = `${quiz.weekNumber ? `Week_${quiz.weekNumber}_` : ''}${quiz.title || 'Quiz'}`
    .replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `Quiz_${base}_${new Date().toISOString().slice(0, 10)}.xlsx`;
}

/**
 * Build and download the workbook.
 *  quiz: the quiz doc · statusMap: { [registrationId]: tracking status } · answerKey: { answers }
 *  participants: registrations (everyone, so Not Attempted rows are included)
 */
export async function downloadQuizWorkbook({ quiz, statusMap = {}, answerKey, participants = [] }) {
  const XLSX = await import('xlsx');
  const key = answerKey?.answers || {};
  const questions = quiz.questions || [];
  const graded = questions.filter((q) => isGraded(q, key)).length;
  const counted = (s) => (s?.history || []).find((h) => h.score === s.score) || s?.history?.[s.history.length - 1] || null;

  // Sheet 1: one row per participant (answers from the attempt that counts)
  const responses = participants.map((p, i) => {
    const s = statusMap[regIdOf(p)];
    const a = counted(s);
    const row = {
      'S.No': i + 1,
      'Registration ID': regIdOf(p),
      'Full Name': p.fullName || p.name || '',
      'Email': p.email || '',
      'Mobile': p.mobile ? `${p.countryCode || '+91'} ${p.mobile}` : '',
      'Current Residence': p.currentResidence || p.city || '',
      'Status': s ? 'Attempted' : 'Not Attempted',
      'Attempts Used': s ? `${s.attempts} of ${quiz.maxAttempts || 1}` : '',
      'Score': s?.score?.total ? `${s.score.correct}/${s.score.total}` : '',
      'Percentage': pct(s?.score),
      'Attempt Counted': a && (quiz.maxAttempts || 1) > 1 ? a.attemptNumber : '',
      'Time Taken': duration(a?.timeTakenSec),
      'First Submitted': when(s?.firstSubmittedAt),
      'Last Submitted': when(s?.lastSubmittedAt),
    };
    questions.forEach((q, qi) => {
      const v = a?.answers?.[q.id];
      row[answerHeading(q, qi)] = answerText(q, v);
      row[resultHeading(qi)] = s ? resultText(q, v, key) : '';
    });
    return row;
  });

  // Sheet 2: summary
  const attempted = participants.filter((p) => statusMap[regIdOf(p)]);
  const scores = attempted.map((p) => statusMap[regIdOf(p)].score).filter((s) => s?.total);
  const percents = scores.map((s) => s.percent);
  const avg = percents.length ? Math.round(percents.reduce((x, y) => x + y, 0) / percents.length) : null;
  const times = attempted.map((p) => counted(statusMap[regIdOf(p)])?.timeTakenSec).filter(Number.isFinite);
  const avgTime = times.length ? Math.round(times.reduce((x, y) => x + y, 0) / times.length) : null;
  const summary = [
    ['Quiz', quiz.weekNumber ? `${quizLabel(quiz)} – ${quiz.title}` : quiz.title],
    ['Opens', when(quiz.opensAt)],
    ['Closes', quiz.closesAt ? when(quiz.closesAt) : 'No closing time'],
    ['Questions', questions.length],
    ['Scored questions', graded],
    ['Attempts allowed', quiz.maxAttempts || 1],
    ...((quiz.maxAttempts || 1) > 1 ? [['Score that counts', quiz.scorePolicy === 'latest' ? 'Latest attempt' : 'Best attempt']] : []),
    [],
    ['Participants', participants.length],
    ['Attempted', attempted.length],
    ['Not attempted', participants.length - attempted.length],
    ['Attempt rate', participants.length ? `${Math.round((attempted.length / participants.length) * 100)}%` : ''],
    ...(avg !== null ? [
      ['Average score', `${avg}%`],
      ['Highest score', `${Math.max(...percents)}%`],
      ['Lowest score', `${Math.min(...percents)}%`],
      ['Perfect scores', scores.filter((s) => s.correct === s.total).length],
    ] : []),
    ...(avgTime !== null ? [['Average time taken', formatDuration(avgTime)]] : []),
    [],
    ['Exported on', formatWhen(new Date())],
  ];

  // Sheet 3: per question
  const questionRows = questions.map((q, qi) => {
    const marks = attempted.map((p) => {
      const a = counted(statusMap[regIdOf(p)]);
      return markQuestion(q, a?.answers?.[q.id], key);
    });
    const answered = marks.filter((m) => m !== 'unanswered').length;
    const correct = marks.filter((m) => m === 'correct').length;
    return {
      'Q#': qi + 1,
      'Type': QUESTION_TYPES[q.type || 'mcq']?.label || q.type,
      'Required': q.required ? 'Yes' : 'No',
      'Question': q.text,
      'Description': q.description || '',
      'Options': hasOptions(q.type || 'mcq') ? (q.options || []).map((o) => o.text).join('; ') : '',
      'Correct Answer': correctText(q, key) || (hasOptions(q.type || 'mcq') ? '' : 'Not scored'),
      'Answered': answered,
      'Correct': isGraded(q, key) ? correct : '',
      '% Correct': isGraded(q, key) && answered ? `${Math.round((correct / answered) * 100)}%` : '',
    };
  });

  // Sheet 4 (retakes only): every attempt
  const attemptRows = [];
  if ((quiz.maxAttempts || 1) > 1) {
    attempted.forEach((p) => {
      const s = statusMap[regIdOf(p)];
      const c = counted(s);
      (s.history || []).forEach((h) => {
        const row = {
          'Registration ID': regIdOf(p),
          'Full Name': p.fullName || p.name || '',
          'Attempt': h.attemptNumber,
          'Counts': h === c ? 'Yes' : '',
          'Submitted': when(h.submittedAt),
          'Time Taken': duration(h.timeTakenSec),
          'Score': h.score?.total ? `${h.score.correct}/${h.score.total}` : '',
          'Percentage': pct(h.score),
        };
        questions.forEach((q, qi) => {
          row[answerHeading(q, qi)] = answerText(q, h.answers?.[q.id]);
          row[resultHeading(qi)] = resultText(q, h.answers?.[q.id], key);
        });
        attemptRows.push(row);
      });
    });
  }

  const wb = XLSX.utils.book_new();
  const responsesSheet = XLSX.utils.json_to_sheet(responses);
  responsesSheet['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 13 },
    { wch: 9 }, { wch: 11 }, { wch: 9 }, { wch: 14 }, { wch: 22 }, { wch: 22 },
    ...questions.flatMap((q) => [{ wch: q.type === 'paragraph' ? 50 : 34 }, { wch: 12 }]),
  ];
  responsesSheet['!autofilter'] = { ref: responsesSheet['!ref'] };
  XLSX.utils.book_append_sheet(wb, responsesSheet, 'Responses');

  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  const questionSheet = XLSX.utils.json_to_sheet(questionRows);
  questionSheet['!cols'] = [{ wch: 5 }, { wch: 16 }, { wch: 9 }, { wch: 50 }, { wch: 30 }, { wch: 50 }, { wch: 30 }, { wch: 10 }, { wch: 9 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, questionSheet, 'Questions');

  if (attemptRows.length) {
    const allSheet = XLSX.utils.json_to_sheet(attemptRows);
    allSheet['!autofilter'] = { ref: allSheet['!ref'] };
    XLSX.utils.book_append_sheet(wb, allSheet, 'All Attempts');
  }

  XLSX.writeFile(wb, fileName(quiz));
}
