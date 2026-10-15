// Parses the text of an Albany County "Summary Results Report" PDF into its
// races. Shared by the /results page and the results proxy worker, so it must
// not import anything.

const SUMMARY_ROWS = {
  'write-in totals': 'writeIn',
  'total votes cast': 'totalVotes',
  overvotes: 'overvotes',
  undervotes: 'undervotes',
  'contest totals': 'contestTotal',
};

const isNumber = (s) => /^\d[\d,]*$/.test(s);
const toNumber = (s) => Number(s.replace(/,/g, ''));

// Group text items into lines (numbers sit a couple of points off their labels).
function toLines(items) {
  const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const item of sorted) {
    const line = lines.at(-1);
    if (line && line.y - item.y <= 4) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  return lines.map(({ items }) => {
    items.sort((a, b) => a.x - b.x);
    // Vote counts sit in columns well right of the labels, so a number inside a
    // race title (e.g. "HOUSE DISTRICT 13") stays part of the label.
    const isCount = (i) => isNumber(i.str.trim()) && i.x - items[0].x > 100;
    return {
      label: items
        .filter((i) => !isCount(i))
        .map((i) => i.str.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
      // First number is the TOTAL column; later ones are per-ballot-type breakdowns.
      numbers: items.filter(isCount).map((i) => toNumber(i.str.trim())),
    };
  });
}

// pages: arrays of { str, x, y } text items, one array per page.
export function parseReport(pages) {
  const report = { election: null, status: null, asOf: null, ballotsCast: null, races: [] };
  let race = null;
  let lastTitle = null;

  for (const items of pages) {
    for (const { label, numbers } of toLines(items)) {
      const lower = label.toLowerCase();

      // Page header and footer.
      const status = label.match(/\b((?:UN)?OFFICIAL) RESULTS\b/i);
      if (status) report.status ??= status[1].toUpperCase();
      const election = label.match(/\b\d{4} [A-Za-z ]*Election\b/);
      if (election && /^summary results report|^\d{4} /i.test(label)) report.election ??= election[0];
      const footer = label.match(/^Election Summary - (\d\d\/\d\d\/\d{4} \d\d?:\d\d\s?[AP]M)/i);
      if (footer) {
        report.asOf ??= footer[1];
        continue;
      }
      if (
        /^summary results report|results$|^election summary|albany county|^page \d|^statistics$/i.test(label) ||
        /^\d{4} [A-Za-z ]*Election\b/.test(label) ||
        /^[A-Z][a-z]+ \d\d?, ?\d{4}$/.test(label)
      ) {
        continue;
      }

      if (/^ballots cast\W*total/i.test(label)) {
        if (numbers.length) report.ballotsCast ??= numbers[0];
        continue;
      }
      if (/^ballots cast/i.test(label)) continue;

      // Column headings ("TOTAL", "ELECTION DAY", "EARLY ABSENTEE", "VOTE %").
      if (/^(total|election|day|absentee|early|vote|%|\s)+$/i.test(label)) continue;

      const voteFor = label.match(/^Vote For (\d+)$/i);
      if (voteFor) {
        race = { title: lastTitle, voteFor: Number(voteFor[1]), candidates: [] };
        report.races.push(race);
        lastTitle = null;
        continue;
      }

      if (!numbers.length) {
        lastTitle = label;
        continue;
      }
      if (!race) continue;

      const key = SUMMARY_ROWS[lower];
      if (key) race[key] = numbers[0];
      else race.candidates.push({ name: label, votes: numbers[0] });
    }
  }

  for (const r of report.races) {
    const candidateSum = r.candidates.reduce((sum, c) => sum + c.votes, 0) + (r.writeIn ?? 0);
    r.valid =
      Boolean(r.title) &&
      r.totalVotes === candidateSum &&
      (r.contestTotal === undefined || r.contestTotal === r.totalVotes + (r.overvotes ?? 0) + (r.undervotes ?? 0));
  }
  return report;
}
