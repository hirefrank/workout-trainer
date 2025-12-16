import fs from 'fs';
import yaml from 'js-yaml';

console.log('🔍 Comparing program.yaml with PROGRAM_REFERENCE.md...\n');

// Load YAML
const programYaml = fs.readFileSync('./program.yaml', 'utf8');
const data = yaml.load(programYaml);

// Load and parse markdown reference
const referenceDoc = fs.readFileSync('./docs/PROGRAM_REFERENCE.md', 'utf8');

// Parse markdown tables into structured data
function parseMarkdownTables(markdown) {
  const weeks = [];
  const lines = markdown.split('\n');

  let currentWeek = null;
  let currentDay = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Week header
    const weekMatch = line.match(/^## WEEK (\d+)/);
    if (weekMatch) {
      currentWeek = {
        number: parseInt(weekMatch[1]),
        days: []
      };
      weeks.push(currentWeek);
      continue;
    }

    // Day header
    const dayMatch = line.match(/^### Day (\d+):/);
    if (dayMatch) {
      currentDay = {
        number: parseInt(dayMatch[1]),
        exercises: []
      };
      if (currentWeek) {
        currentWeek.days.push(currentDay);
      }
      inTable = true;
      continue;
    }

    // Table row (exercise)
    if (inTable && line.startsWith('|') && !line.includes('---') && !line.includes('Exercise')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);

      // Skip superset/section headers
      if (parts[0].includes('**') || parts.length < 3) {
        continue;
      }

      const exercise = {
        name: parts[0],
        setsReps: parts[1],
        weight: parts[2],
        notes: parts[3] || ''
      };

      if (currentDay) {
        currentDay.exercises.push(exercise);
      }
    }

    // End of table
    if (line === '---' || (line.startsWith('##') && !line.includes('WEEK'))) {
      inTable = false;
    }
  }

  return weeks;
}

const referenceWeeks = parseMarkdownTables(referenceDoc);

// Exercise name mapping (reference -> YAML ID)
const exerciseMap = {
  'KB Deadlift': 'kb-deadlift',
  'CPG - GSQ Pry': 'cpg-gsq-pry',
  'Turkish Getup': 'turkish-getup',
  '2-Hand Swing': '2-hand-swing',
  'Goblet Squat': 'goblet-squat',
  'Wall Press Abs': 'wall-press-abs',
  'Push-ups': 'push-ups',
  'CPG - DeadBug Arms': 'cpg-deadbug-arms',
  'CPG Suitcase March': 'cpg-suitcase-march',
};

// Compare
const issues = [];
let totalChecked = 0;

for (const refWeek of referenceWeeks) {
  const yamlWeek = data.weeks.find(w => w.number === refWeek.number);

  if (!yamlWeek) {
    issues.push({
      type: 'missing_week',
      week: refWeek.number,
      message: `Week ${refWeek.number} missing in YAML`
    });
    continue;
  }

  for (const refDay of refWeek.days) {
    const yamlDay = yamlWeek.days.find(d => d.number === refDay.number);

    if (!yamlDay) {
      issues.push({
        type: 'missing_day',
        week: refWeek.number,
        day: refDay.number,
        message: `Week ${refWeek.number}, Day ${refDay.number} missing in YAML`
      });
      continue;
    }

    // Compare exercises
    for (const refEx of refDay.exercises) {
      const exId = exerciseMap[refEx.name];
      if (!exId) continue; // Skip unknown exercises

      const yamlEx = yamlDay.exercises.find(e => e.exercise_id === exId);
      totalChecked++;

      if (!yamlEx) {
        issues.push({
          type: 'missing_exercise',
          week: refWeek.number,
          day: refDay.number,
          exercise: refEx.name,
          message: `${refEx.name} missing`
        });
        continue;
      }

      // Parse reference sets/reps
      const setsRepsMatch = refEx.setsReps.match(/(\d+)(?:\s*×\s*(\d+))?/);
      const refSets = setsRepsMatch ? setsRepsMatch[1] : null;
      const refReps = setsRepsMatch && setsRepsMatch[2] ? setsRepsMatch[2] : null;

      // Parse reference weight
      const weightMatch = refEx.weight.match(/(\d+)\s*lbs|BW/);
      const refWeight = weightMatch ? (weightMatch[1] || 'BW') : null;

      // Compare sets (for unilateral, YAML should match the "X sets" from notes)
      const unilateralExercises = ['turkish-getup', 'cpg-suitcase-march'];
      const isUnilateral = unilateralExercises.includes(exId);

      if (isUnilateral) {
        // For unilateral, check against notes in reference
        const notesMatch = refEx.notes.match(/(\d+)\s+sets/);
        const expectedSets = notesMatch ? notesMatch[1] : refSets;

        if (yamlEx.sets != expectedSets) {
          issues.push({
            type: 'sets_mismatch',
            week: refWeek.number,
            day: refDay.number,
            exercise: refEx.name,
            message: `Sets mismatch: YAML has ${yamlEx.sets}, reference has ${refSets} (${refEx.notes})`
          });
        }
      } else {
        // For bilateral exercises, compare directly
        const yamlSetsStr = String(yamlEx.sets || '');
        if (refSets && yamlSetsStr !== refSets && !yamlSetsStr.includes('-')) {
          issues.push({
            type: 'sets_mismatch',
            week: refWeek.number,
            day: refDay.number,
            exercise: refEx.name,
            message: `Sets mismatch: YAML has ${yamlEx.sets}, reference has ${refSets}`
          });
        }
      }

      // Compare reps
      if (refReps && yamlEx.reps && String(yamlEx.reps) !== refReps) {
        issues.push({
          type: 'reps_mismatch',
          week: refWeek.number,
          day: refDay.number,
          exercise: refEx.name,
          message: `Reps mismatch: YAML has ${yamlEx.reps}, reference has ${refReps}`
        });
      }

      // Compare weight (if explicit weight in YAML)
      if (yamlEx.weight && refWeight !== 'BW') {
        if (String(yamlEx.weight) !== refWeight) {
          issues.push({
            type: 'weight_mismatch',
            week: refWeek.number,
            day: refDay.number,
            exercise: refEx.name,
            message: `Weight mismatch: YAML has ${yamlEx.weight}, reference has ${refWeight}`
          });
        }
      }
    }
  }
}

// Report
console.log(`✓ Checked ${totalChecked} exercises across ${referenceWeeks.length} weeks\n`);

if (issues.length === 0) {
  console.log('✅ No issues found! YAML matches reference document.\n');
} else {
  console.log(`⚠️  Found ${issues.length} potential issues:\n`);

  // Group by type
  const byType = {};
  for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }

  for (const [type, typeIssues] of Object.entries(byType)) {
    console.log(`\n${type.toUpperCase().replace(/_/g, ' ')} (${typeIssues.length}):`);
    console.log('─'.repeat(60));

    for (const issue of typeIssues.slice(0, 10)) {
      console.log(`Week ${issue.week}, Day ${issue.day} - ${issue.exercise || ''}`);
      console.log(`  ${issue.message}`);
    }

    if (typeIssues.length > 10) {
      console.log(`  ... and ${typeIssues.length - 10} more`);
    }
  }
}

console.log('\n');
