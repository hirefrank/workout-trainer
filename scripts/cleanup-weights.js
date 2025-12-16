#!/usr/bin/env node
/**
 * Cleanup script to remove redundant weight specifications from program.yaml
 * Keeps weight only when it differs from the bells definition
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse, stringify } from 'yaml';

const YAML_PATH = './program.yaml';

// Read and parse YAML
const yamlContent = readFileSync(YAML_PATH, 'utf8');
const data = parse(yamlContent);

let removedCount = 0;
let keptCount = 0;

// Process each week
data.weeks.forEach(week => {
  week.days.forEach(day => {
    day.exercises.forEach(exercise => {
      const exerciseData = data.exercises[exercise.exercise_id];

      // Skip if no bells definition (bodyweight exercises)
      if (!exerciseData?.bells) {
        return;
      }

      // Skip if no weight specified
      if (exercise.weight === null || exercise.weight === undefined) {
        return;
      }

      // Check if weight matches the bells definition for this weight_type
      if (exercise.weight_type && exerciseData.bells[exercise.weight_type]) {
        const bellsWeight = exerciseData.bells[exercise.weight_type];

        if (exercise.weight === bellsWeight) {
          // Weight matches bells definition - remove it!
          delete exercise.weight;
          removedCount++;
          return;
        }
      }

      // Check if weight matches any bells definition and set weight_type if null
      if (!exercise.weight_type) {
        const bells = exerciseData.bells;

        if (exercise.weight === bells.moderate) {
          exercise.weight_type = 'moderate';
          delete exercise.weight;
          removedCount++;
          return;
        } else if (exercise.weight === bells.heavy) {
          exercise.weight_type = 'heavy';
          delete exercise.weight;
          removedCount++;
          return;
        } else if (exercise.weight === bells.very_heavy) {
          exercise.weight_type = 'very_heavy';
          delete exercise.weight;
          removedCount++;
          return;
        }
      }

      // Custom weight - keep it
      keptCount++;
    });
  });
});

// Write back to file
const newYaml = stringify(data, {
  lineWidth: 0, // Don't wrap lines
  indent: 2,
});

writeFileSync(YAML_PATH, newYaml, 'utf8');

console.log(`✅ Cleanup complete!`);
console.log(`   Removed ${removedCount} redundant weight specifications`);
console.log(`   Kept ${keptCount} custom weights`);
