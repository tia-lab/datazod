# Changesets

This repository uses [changesets](https://github.com/changesets/changesets) to manage releases.

## Adding a changeset

When you make a change that needs to be released, run:

```bash
bun changeset
```

Follow the prompts to select the packages you've modified and specify the type of change:
- **major**: Breaking changes
- **minor**: New features
- **patch**: Bug fixes and small changes

A new markdown file will be created in the `.changeset` directory. You can edit this file to provide more details about your changes.

## Releasing

When changes are merged to the main branch:

1. A PR will be automatically created to update versions and changelogs
2. Once that PR is merged, packages will be published to npm

## Configuration

The changesets configuration is in `.changeset/config.json`.

## Commit Format

Commits should follow the conventional commit format:

```
type(optional-scope): subject
```

For example:
```
feat: add new SQL conversion feature
fix(zod-sql): resolve type mapping issue
docs: update API documentation
```

Including issue numbers in your commit messages is encouraged:
```
feat: add new SQL conversion feature (#123)
fix(zod-sql): resolve type mapping issue (#456)
```