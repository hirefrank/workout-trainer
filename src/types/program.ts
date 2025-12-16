export interface ProgramData {
  program: {
    name: string;
    description: string;
    weeks: number;
    days_per_week: number;
  };
  exercises: Record<string, Exercise>;
  weeks: Week[];
}

export interface Exercise {
  name: string;
  type: "kettlebell" | "bodyweight";
  bells: {
    moderate: number;
    heavy: number;
    very_heavy: number;
  } | null;
}

export interface Week {
  number: number;
  phase: string;
  is_deload: boolean;
  days: Day[];
}

export interface Day {
  number: number;
  name: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  exercise_id: string;
  sets: number | string | null;
  reps: number | null;
  duration?: string;
  weight: number | null;
  weight_type: "moderate" | "heavy" | "very_heavy" | null;
  notes: string | null;
}

export interface CompletedWorkout {
  completedAt: string;
}
