import fs from 'fs';
import yaml from 'js-yaml';

console.log('🔍 Fixing unilateral exercise notation in program.yaml...\n');

const programYaml = fs.readFileSync('./program.yaml', 'utf8');
const data = yaml.load(programYaml);

let fixCount = 0;
const fixes = [];

// Unilateral exercises - sets field means "per side"
const unilateralExercises = ['turkish-getup', 'cpg-suitcase-march'];

for (const week of data.weeks) {
  for (const day of week.days) {
    for (const ex of day.exercises) {
      const exId = ex.exercise_id;
      const isUnilateral = unilateralExercises.includes(exId);

      if (!isUnilateral) continue;

      const sets = String(ex.sets || '');
      const notes = ex.notes || '';

      // Pattern: "X sets total" or "X sets, Modifier" or "X sets progressive"
      const setMatch = notes.match(/(\d+)\s+sets?\s*(total|progressive|,)?/i);

      if (setMatch) {
        const setsFromNotes = parseInt(setMatch[1]);

        // If notes specify a different number than the sets field, use notes value
        if (sets !== String(setsFromNotes) && !sets.includes('-')) {
          fixes.push({
            week: week.number,
            day: day.number,
            exercise: exId,
            old: `sets: ${sets}, notes: "${notes}"`,
            new: `sets: ${setsFromNotes} (per side)`
          });

          ex.sets = setsFromNotes;
          delete ex.notes; // Remove redundant note
          fixCount++;
        }
      }

      // Pattern: Progressive notation like "1-2-2" with "X sets" in notes
      if (sets.match(/^\d+-\d+/)) {
        // Extract total sets from notes (e.g., "3 sets" or "3 sets progressive")
        const setsMatch = notes.match(/(\d+)\s+sets?/i);

        if (setsMatch) {
          const totalSetsFromNotes = parseInt(setsMatch[1]);

          fixes.push({
            week: week.number,
            day: day.number,
            exercise: exId,
            old: `sets: "${sets}", notes: "${notes}"`,
            new: `sets: ${totalSetsFromNotes} (per side), notes: "Progressive: ${sets} reps per side"`
          });

          const oldSets = sets;
          ex.sets = totalSetsFromNotes;
          ex.notes = `Progressive: ${oldSets} reps per side`;
          fixCount++;
        }
      }
    }
  }
}

console.log(`Found ${fixCount} issues to fix:\n`);
fixes.forEach(fix => {
  console.log(`Week ${fix.week}, Day ${fix.day} - ${fix.exercise}`);
  console.log(`  OLD: ${fix.old}`);
  console.log(`  NEW: ${fix.new}\n`);
});

// Write the fixed data back
const fixedYaml = yaml.dump(data, {
  indent: 2,
  lineWidth: -1,
  noRefs: true
});

fs.writeFileSync('./program.yaml', fixedYaml);
console.log(`✅ Fixed ${fixCount} unilateral exercise entries in program.yaml`);
console.log(`\nNote: For unilateral exercises, "sets" field now means "sets per side"`);
console.log(`Display logic should show: "X sets per side (Y total)"\n`);
