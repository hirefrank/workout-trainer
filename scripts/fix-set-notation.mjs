import fs from 'fs';
import yaml from 'js-yaml';

console.log('🔍 Analyzing program.yaml for set notation issues...\n');

const programYaml = fs.readFileSync('./program.yaml', 'utf8');
const data = yaml.load(programYaml);

let fixCount = 0;
const fixes = [];

// Unilateral exercises that are done one side at a time
const unilateralExercises = ['turkish-getup', 'cpg-suitcase-march'];

for (const week of data.weeks) {
  for (const day of week.days) {
    for (const ex of day.exercises) {
      const sets = String(ex.sets || '');
      const notes = ex.notes || '';
      const exId = ex.exercise_id;
      const isUnilateral = unilateralExercises.includes(exId);

      // Pattern 1: Exercise with "X sets total" but different sets value
      if (notes.match(/(\d+) sets total/)) {
        const notesTotal = notes.match(/(\d+) sets total/)[1];
        if (sets !== notesTotal && !sets.includes('-')) {
          const newNote = isUnilateral ? 'Alternate sides' : null;

          fixes.push({
            week: week.number,
            day: day.number,
            exercise: exId,
            old: `sets: ${sets}, notes: "${notes}"`,
            new: `sets: ${notesTotal}${newNote ? `, notes: "${newNote}"` : ''}`
          });

          // Fix it
          ex.sets = parseInt(notesTotal);
          if (newNote) {
            ex.notes = newNote;
          } else {
            // Remove the confusing note
            delete ex.notes;
          }
          fixCount++;
        }
      }

      // Pattern 2: Turkish Getup progressive (1-2-2 becomes clearer)
      if (isUnilateral && sets.match(/^\d+-\d+/) && notes.match(/(\d+) sets progressive/)) {
        const notesTotal = notes.match(/(\d+) sets progressive/)[1];
        fixes.push({
          week: week.number,
          day: day.number,
          exercise: exId,
          old: `sets: "${sets}", notes: "${notes}"`,
          new: `sets: ${notesTotal}, notes: "Progressive: ${sets} reps per side"`
        });

        // Fix it
        const oldSets = sets;
        ex.sets = parseInt(notesTotal);
        ex.notes = `Progressive: ${oldSets} reps per side`;
        fixCount++;
      }
    }
  }
}

console.log(`Found ${fixCount} issues to fix:\n`);
fixes.slice(0, 10).forEach(fix => {
  console.log(`Week ${fix.week}, Day ${fix.day} - ${fix.exercise}`);
  console.log(`  OLD: ${fix.old}`);
  console.log(`  NEW: ${fix.new}\n`);
});

if (fixes.length > 10) {
  console.log(`... and ${fixes.length - 10} more\n`);
}

// Write the fixed data back
const fixedYaml = yaml.dump(data, {
  indent: 2,
  lineWidth: -1, // Don't wrap lines
  noRefs: true
});

fs.writeFileSync('./program.yaml', fixedYaml);
console.log(`✅ Fixed ${fixCount} notation issues in program.yaml\n`);
