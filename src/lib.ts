import * as core from '@actions/core'
import { exec } from '@actions/exec'
import { getOctokit } from '@actions/github'
import { Context } from '@actions/github/lib/context'

/**
 * Convert version string to comparable number
 * @example 5.0.0 -> 50000, 5.8.1 -> 50801
 * @param vstr
 * @returns
 */
export function versionToNumber(vstr: string): number {
  const vChunks = vstr.split('.')
  return +(
    ('00' + vChunks[0]).slice(-2) +
    ('00' + vChunks[1]).slice(-2) +
    ('00' + (vChunks[2] || '')).slice(-2)
  )
}

/**
 * Compare two version strings
 * @returns 1 if v1 < v2, 0 if v1 == v2, -1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const diff = versionToNumber(v1) - versionToNumber(v2)
  return diff === 0 ? 0 : diff / Math.abs(diff)
}

export async function isRepoClean(): Promise<boolean> {
  let output = ''
  await exec('git status --porcelain', [], {
    listeners: {
      stdout: (data: Buffer) => (output += data.toString()),
    },
  })

  return output.trim().length === 0
}

export async function createPullByCurrentChanges({
  branch,
  message,
  base,
  title,
  context,
  octokit,
}: {
  branch: string
  message: string
  base: string
  title: string
  context: Context
  octokit: ReturnType<typeof getOctokit>
}): Promise<void> {
  // Create (or overwrite) a new branch
  await exec('git', ['switch', '-C', branch])

  // Commit the changes
  await exec('git', ['add', '.'])
  await exec('git', [
    'commit',
    `-m="${message.replace(/[\\"]/g, x => '\\' + x)}"`,
  ])

  // Push commits
  await exec('git', ['push', '-u', 'origin', branch, '-f'])
  // Create a pull request
  try {
    await octokit.rest.pulls.create({
      ...context.repo,
      title,
      base,
      head: `refs/heads/${branch}`,
      body: `[![Created by wp-updater-action](https://img.shields.io/badge/Created%20by-wp--updater--action-orange?style=flat-square)](https://github.com/nandenjin/wp-updater-action).`,
    })
  } catch (e) {
    // If PR already exists, ignore
    core.error((e as Error).toString())
  }
}
