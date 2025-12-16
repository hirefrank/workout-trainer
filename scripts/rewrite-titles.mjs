#!/usr/bin/env node
/**
 * Rewrite workout day titles to have high information gain:
 * - Show changes in swings + getups from previous week (same day)
 * - Explain purpose/value of accessory work
 */

import fs from "fs";
import yaml from "js-yaml";

// Load program data
const programYaml = fs.readFileSync("./program.yaml", "utf8");
const program = yaml.load(programYaml);

// Helper to get swing info for a day
function getSwingInfo(day) {
  const swingEx = day.exercises.find((ex) => ex.exercise_id === "2-hand-swing");
  if (!swingEx) return null;
  return {
    sets: swingEx.sets,
    reps: swingEx.reps,
    total: swingEx.sets * swingEx.reps,
    weight: swingEx.weight_type,
  };
}

// Helper to get TGU info for a day
function getTGUInfo(day) {
  const tguEx = day.exercises.find((ex) => ex.exercise_id === "turkish-getup");
  if (!tguEx) return null;
  return {
    sets: tguEx.sets,
    weight: tguEx.weight_type,
  };
}

// Helper to identify accessory work purpose
function getAccessoryPurpose(day) {
  const exercises = day.exercises.map((ex) => ex.exercise_id);

  // Check for patterns
  const hasDeadlift = exercises.includes("kb-deadlift");
  const hasSquat = exercises.includes("goblet-squat");
  const hasPushups = exercises.includes("push-ups");
  const hasCore = exercises.includes("cpg-deadbug-arms") || exercises.includes("wall-press-abs");
  const hasSuitcase = exercises.includes("cpg-suitcase-march");

  if (hasDeadlift && hasSquat) return "Lower Body Strength";
  if (hasPushups && exercises.length > 4) return "Upper Body Push";
  if (hasCore && hasSuitcase) return "Core Stability";
  if (hasPushups && exercises.length <= 4) return "Strength Maintenance";
  if (hasDeadlift || hasSquat) return "Strength Work";
  return "Accessory Work";
}

// Weight tier comparison
const weightTiers = { moderate: 1, heavy: 2, very_heavy: 3 };

// Generate training focus description
function generateTitle(week, day, prevWeekDay) {
  const swingInfo = getSwingInfo(day);
  const tguInfo = getTGUInfo(day);
  const prevSwingInfo = prevWeekDay ? getSwingInfo(prevWeekDay) : null;
  const prevTGUInfo = prevWeekDay ? getTGUInfo(prevWeekDay) : null;

  let trainingFocus = "";

  if (!prevSwingInfo || !prevTGUInfo) {
    // Week 1 - establish baseline
    if (day.number === 1 || day.number === 2) {
      trainingFocus = "Volume baseline";
    } else if (day.number === 3) {
      trainingFocus = "TGU technique practice";
    } else {
      trainingFocus = "Active recovery day";
    }
  } else {
    // Compare to previous week
    const swingDiff = swingInfo.total - prevSwingInfo.total;
    const swingPercent = Math.round((swingDiff / prevSwingInfo.total) * 100);
    const tguWeightChange = weightTiers[tguInfo.weight] - weightTiers[prevTGUInfo.weight];

    // Determine primary focus
    if (swingDiff > 20) {
      // Significant swing volume increase
      trainingFocus = `Swing volume +${swingPercent}%`;
    } else if (swingDiff < -20) {
      // Deload week
      trainingFocus = "Recovery & technique";
    } else if (tguWeightChange > 0) {
      // TGU weight progression
      trainingFocus = `TGU strength progression`;
    } else if (tguWeightChange < 0) {
      // TGU weight reduction (deload or recovery)
      trainingFocus = "TGU recovery";
    } else if (tguInfo.sets !== prevTGUInfo.sets) {
      // TGU volume change
      if (tguInfo.sets.toString().includes("-")) {
        trainingFocus = "TGU volume progression";
      } else {
        trainingFocus = "TGU skill practice";
      }
    } else if (swingInfo.weight !== prevSwingInfo.weight) {
      // Swing weight change
      const swingWeightChange = weightTiers[swingInfo.weight] - weightTiers[prevSwingInfo.weight];
      if (swingWeightChange > 0) {
        trainingFocus = "Swing power development";
      } else {
        trainingFocus = "Swing technique refinement";
      }
    } else {
      // Same volume - consolidation
      if (day.number === 3) {
        trainingFocus = "Skill consolidation";
      } else if (day.number === 4) {
        trainingFocus = "Maintenance volume";
      } else {
        trainingFocus = "Strength consolidation";
      }
    }
  }

  // Accessory purpose
  const accessory = getAccessoryPurpose(day);

  return `${trainingFocus} | ${accessory}`;
}

// Rewrite all titles
for (let weekIdx = 0; weekIdx < program.weeks.length; weekIdx++) {
  const week = program.weeks[weekIdx];
  const prevWeek = weekIdx > 0 ? program.weeks[weekIdx - 1] : null;

  for (let dayIdx = 0; dayIdx < week.days.length; dayIdx++) {
    const day = week.days[dayIdx];
    const prevWeekDay = prevWeek ? prevWeek.days[dayIdx] : null;

    const newTitle = generateTitle(week, day, prevWeekDay);
    day.name = newTitle;

    console.log(`Week ${week.number} Day ${day.number}: ${newTitle}`);
  }
}

// Write updated YAML
const updatedYaml = yaml.dump(program, {
  lineWidth: -1, // No line wrapping
  noRefs: true,
});

fs.writeFileSync("./program.yaml", updatedYaml, "utf8");
console.log("\n✅ Updated program.yaml with new titles");
