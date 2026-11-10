# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-11-10

### Added

- Hovering assistant response text now shows the turn completion time near the pointer
- Response body hover covers paragraphs, headings, list items, block quotes, code blocks and tables
- Text selection, pointer presses and interactive elements such as links and buttons suppress the body tooltip

### Changed

- Documented the new response-text hover behavior in both READMEs
- Updated the pinned installation example to `0.1.1`

## [0.1.0] - 2026-10-30

### Added

- Hover tooltip on agent response durations in OpenCode Desktop sessions
- Exact turn completion timestamp read from the current session's synced messages
- Full date/time formatting that matches OpenCode's user message timestamp tooltip
- Native compact tooltip styling with light and dark theme support
- Chinese and English documentation with a preview image
- npm installation instructions and npm/CI badges
- GitHub Actions CI workflow for type checks, tests and builds on Windows and Ubuntu
- GitHub Actions release workflow for future npm Trusted Publishing releases
- Standalone browser demo
- jsdom tests for duration detection, timestamp resolution, tooltip behavior and cleanup

### Notes

- Developed and verified with OpenCode Desktop 2.2.1.
- The Desktop GUI plugin API is experimental and may change.
- The implementation relies on OpenCode's session timeline DOM structure.

[Unreleased]: https://github.com/DevDengChao/opencode-plugin-show-agent-response-time/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/DevDengChao/opencode-plugin-show-agent-response-time/releases/tag/v0.1.1
[0.1.0]: https://github.com/DevDengChao/opencode-plugin-show-agent-response-time/releases/tag/v0.1.0
