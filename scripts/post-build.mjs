#!/usr/bin/env node
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { cpSync, rmSync, mkdirSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = join(__dirname, '..')

// Move dist/client/* to dist/client/workout/*
const clientDir = join(root, 'dist/client')
const workoutDir = join(clientDir, 'workout')

console.log('Reorganizing client assets for /workout basepath...')

// Create workout directory
mkdirSync(workoutDir, { recursive: true })

// Move all files/folders to workout subdirectory
const fs = await import('node:fs')
const entries = fs.readdirSync(clientDir, { withFileTypes: true })

for (const entry of entries) {
  if (entry.name === 'workout') continue

  const source = join(clientDir, entry.name)
  const dest = join(workoutDir, entry.name)

  console.log(`Moving ${entry.name} to workout/`)
  cpSync(source, dest, { recursive: true })
  rmSync(source, { recursive: true, force: true })
}

console.log('✓ Client assets reorganized')
