import { useState } from "react";
import type { Day, WorkoutExercise, ProgramData } from "~/types/program";
import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

interface WorkoutCardProps {
  week: number;
  day: Day;
  exercises: ProgramData["exercises"];
  isComplete: boolean;
  onToggleComplete: () => void;
  canEdit: boolean;
}

export function WorkoutCard({
  week,
  day,
  exercises,
  isComplete,
  onToggleComplete,
  canEdit,
}: WorkoutCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        "border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
        isComplete && "bg-green-100"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">
              Day {day.number}: {day.name}
            </h3>
            {isComplete && (
              <Check className="w-5 h-5 text-green-600" strokeWidth={3} />
            )}
          </div>
          <p className="text-sm text-zinc-600 mt-1">
            {day.exercises.length} exercises
          </p>
        </div>

        {canEdit && (
          <button
            onClick={onToggleComplete}
            className={cn(
              "px-4 py-2 font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
              isComplete
                ? "bg-white hover:bg-zinc-100"
                : "bg-green-400 hover:bg-green-500"
            )}
          >
            {isComplete ? "Undo" : "Complete"}
          </button>
        )}
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-4 text-sm font-medium text-zinc-700 hover:text-black"
      >
        {isExpanded ? "Hide exercises ↑" : "Show exercises ↓"}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-2">
          {day.exercises.map((ex, idx) => (
            <ExerciseRow
              key={idx}
              exercise={ex}
              exerciseData={exercises[ex.exercise_id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseRow({
  exercise,
  exerciseData,
}: {
  exercise: WorkoutExercise;
  exerciseData: ProgramData["exercises"][string];
}) {
  const getWeightDisplay = () => {
    if (exercise.weight) {
      return `${exercise.weight} lbs`;
    }
    if (exerciseData.type === "bodyweight") {
      return "BW";
    }
    return "";
  };

  const getSetsReps = () => {
    const parts = [];
    if (exercise.sets) parts.push(`${exercise.sets} sets`);
    if (exercise.reps) parts.push(`${exercise.reps} reps`);
    if (exercise.duration) parts.push(exercise.duration);
    return parts.join(" × ") || "—";
  };

  return (
    <div className="flex items-start gap-3 p-2 bg-white border border-zinc-300">
      <div className="flex-1">
        <p className="font-medium">{exerciseData.name}</p>
        <p className="text-sm text-zinc-600">
          {getSetsReps()} • {getWeightDisplay()}
          {exercise.weight_type && (
            <span className="ml-2 text-xs uppercase text-zinc-500">
              ({exercise.weight_type.replace("_", " ")})
            </span>
          )}
        </p>
        {exercise.notes && (
          <p className="text-xs text-zinc-500 mt-1">{exercise.notes}</p>
        )}
      </div>
    </div>
  );
}
