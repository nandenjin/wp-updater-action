module.exports = {
  beforeCommitChanges: ({ exec }) => {
    exec('npm run build')
    exec('git add dist')
  },
  publishCommand: () => 'echo NOOP',
}
