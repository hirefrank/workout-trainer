import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import programData from "../../program.yaml";
import type { ProgramData } from "~/types/program";
import { WorkoutCard } from "~/components/WorkoutCard";
import {
  getCompletedWorkouts,
  markWorkoutComplete,
  unmarkWorkout,
} from "~/server/workouts";
import { login, logout, checkAuth } from "~/server/auth";

const program = programData as ProgramData;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        name: "description",
        content: `Track your ${program.program.name.toLowerCase()}. View workout details, mark exercises complete, and monitor your progress through each training phase.`,
      },
    ],
    title: `${program.program.name} - Workout Tracker`,
  }),
  component: HomePage,
});

function HomePage() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [completions, setCompletions] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load completions and check authentication
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check auth status from HttpOnly cookie
        const { isAuthenticated: authStatus } = await checkAuth();
        setIsAuthenticated(authStatus);

        const data = await getCompletedWorkouts();
        setCompletions(data);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ password });
      setIsAuthenticated(true);
      setPassword("");
      setShowAuth(false);
    } catch (error) {
      alert("Invalid password");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleToggleComplete = async (week: number, day: number) => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }

    const key = `workout:${week}-${day}`;
    const isComplete = !!completions[key];

    try {
      if (isComplete) {
        await unmarkWorkout({ week, day });
        const newCompletions = { ...completions };
        delete newCompletions[key];
        setCompletions(newCompletions);
      } else {
        const result = await markWorkoutComplete({ week, day });
        setCompletions({
          ...completions,
          [key]: result.completion,
        });
      }
    } catch (error) {
      alert("Failed to update workout. Please try logging in again.");
      await handleLogout();
    }
  };

  const week = program.weeks.find((w) => w.number === currentWeek);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-600">Loading...</p>
      </div>
    );
  }

  if (!week) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Week {currentWeek} not found</p>
      </div>
    );
  }

  const totalWeeks = program.program.weeks;
  const completedCount = week.days.filter(
    (day) => !!completions[`workout:${currentWeek}-${day.number}`]
  ).length;

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">
              Week {currentWeek} {week.is_deload && "🔴 DELOAD"}
            </h2>
            <p className="text-zinc-600">{week.phase}</p>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">
              {completedCount} / {week.days.length} days
            </p>
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-xs text-zinc-600 hover:text-black mt-1"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                Login to track
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
            disabled={currentWeek === 1}
            className="px-3 py-1 font-bold border-2 border-black bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            ←
          </button>

          <div className="flex-1 bg-zinc-200 h-2 border border-black">
            <div
              className="bg-green-500 h-full"
              style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
            />
          </div>

          <button
            onClick={() => setCurrentWeek(Math.min(totalWeeks, currentWeek + 1))}
            disabled={currentWeek === totalWeeks}
            className="px-3 py-1 font-bold border-2 border-black bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            →
          </button>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuth && !isAuthenticated && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-black p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xl font-bold mb-4">Enter Password</h3>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black"
                placeholder="Password"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 font-bold border-2 border-black bg-green-400 hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setShowAuth(false)}
                  className="px-4 py-2 font-bold border-2 border-black bg-white hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workouts */}
      <div className="space-y-4">
        {week.days.map((day) => (
          <WorkoutCard
            key={day.number}
            week={currentWeek}
            day={day}
            exercises={program.exercises}
            isComplete={!!completions[`workout:${currentWeek}-${day.number}`]}
            onToggleComplete={() => handleToggleComplete(currentWeek, day.number)}
            canEdit={isAuthenticated}
          />
        ))}
      </div>

      {/* Program Info */}
      <div className="bg-zinc-100 border border-zinc-300 p-4 text-sm text-zinc-600">
        <p className="font-bold mb-2">{program.program.name}</p>
        <p>{program.program.description}</p>
      </div>
    </div>
  );
}
