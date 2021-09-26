import { exec } from '@actions/exec'

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
