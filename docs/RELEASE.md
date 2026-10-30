# Maintainer release workflow

1. Review the diff for correctness, private account/project data, runtime assets and evidence claims.
2. Run `npm ci --ignore-scripts`, `npm test`, `python -m unittest discover -s tests`, skill validation and `git diff --check`.
3. Update package version, lockfile and changelog together. Server identity reads package metadata.
4. Run `npm pack`; inspect the allowlisted archive. Install that tarball into a clean temporary prefix and verify stdio tool discovery and offline validation from the installed server.
5. Push the reviewed commit and wait for the GitHub checks, including the Windows/Linux/macOS Node matrix. If they fail, fix before tagging a stable release. Offline CI does not test a logged-in vendor session.
6. Record live smoke evidence only from an explicitly authorized sandbox: runtime build, model counts, backup, change, simulation time and export reopen. Keep designs and account data private.
7. Tag only the exact verified commit. Publishing to npm requires a separate registry account and explicit release decision; a GitHub commit or local tgz is not a registry release.

No automated email or contact submission is part of a release. The official evaluation proposal remains a draft until the maintainer chooses a verified recipient and requests sending.
