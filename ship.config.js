module.exports = {
  beforeCommitChanges: ({ exec }) => {
    exec('npm run build')
    exec('git add dist')
  },
  publishCommand: () => 'echo NOOP',
  afterPublish({ exec, version }) {
    // Create and push short-handed tag
    const shortName = 'v' + version.replace(/\..+$/, '')
    exec(`git tag -f ${shortName}`)
    exec(`git push -f origin ${shortName}`)
  },
}
