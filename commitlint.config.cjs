/* eslint-disable  */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  // Removed custom parserPreset that was causing issues
  rules: {
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 350],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 200],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [0],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'build', // Changes that affect the build system or external dependencies
        'chore', // General maintenance tasks or small, non-user-facing changes
        'ci', // Changes to our CI configuration files and scripts
        'docs', // Documentation only changes
        'feat', // A new feature
        'fix', // A bug fix
        'perf', // A code change that improves performance
        'refactor', // A code change that neither fixes a bug nor adds a feature
        'style', // Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
        'test', // Adding missing tests or correcting existing tests
        'anim', // Animation changes
        'section' // Section changes
      ]
    ]
    // Removed custom rules: 'ticket-empty' and 'ticket-pattern'
  }
}
