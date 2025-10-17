# Agent Skills

This directory contains Agent Skills for the uspark project. Skills are organized folders of instructions, scripts, and resources that Claude can discover and load dynamically to perform better at specific tasks.

## What are Agent Skills?

Agent Skills use **progressive disclosure** to provide context efficiently:
1. **Metadata** (name + description) - Always loaded at startup
2. **SKILL.md** - Loaded when skill is relevant to current task
3. **Additional files** - Loaded only when specific details are needed

This approach allows Claude to access unbounded amounts of context without overwhelming the context window.

## Available Skills

### 1. Conventional Commits (`conventional-commits/`)

Provides comprehensive guidance on writing conventional commit messages that follow project standards and trigger automated releases.

**When to use:**
- Creating commit messages
- Validating commit messages
- Planning commits
- Understanding release triggers

**Files:**
- `SKILL.md` - Quick reference and core rules
- `types.md` - Detailed type definitions and usage
- `release-triggers.md` - Which commits trigger releases
- `examples.md` - Extensive good/bad examples

**Example usage:**
```
User: "Commit these changes"
Claude: *Loads conventional-commits skill*
Claude: "Based on your changes, I suggest: feat: add user dashboard"
```

### 2. Project Principles (`project-principles/`)

Defines the fundamental design principles and coding standards for the uspark project. These principles are MANDATORY for all code.

**When to use:**
- Before writing any code
- During code review
- When making architectural decisions
- Resolving design questions

**Files:**
- `SKILL.md` - Overview of four core principles
- `yagni.md` - YAGNI principle (You Aren't Gonna Need It)
- `no-defensive.md` - Avoid defensive programming
- `type-safety.md` - Strict type checking rules
- `zero-lint.md` - Zero tolerance for lint violations

**Example usage:**
```
User: "Add error handling to this function"
Claude: *Loads no-defensive.md*
Claude: "Following project principles, let's let this error propagate naturally..."
```

## How Skills Work

### Progressive Loading

Skills are loaded in stages:

```
Startup:
  ├─ Load all skill metadata (name + description)
  └─ Claude knows what skills are available

Task starts:
  ├─ Claude identifies relevant skills
  ├─ Loads SKILL.md for relevant skills
  └─ Continues with task

Need more detail:
  ├─ Claude reads referenced files
  └─ Loads only what's needed
```

### Integration with Workflows

Skills integrate seamlessly with sub-agents:

```
Sub-agent (pr-creator)
  ↓
  Uses Skills:
  ├─ conventional-commits (for commit messages)
  └─ project-principles (for code quality)
```

## Best Practices

### For Skill Authors

1. **Keep SKILL.md concise** - Quick reference only
2. **Use clear file names** - Make purpose obvious
3. **Reference files explicitly** - Tell Claude when to read them
4. **Organize by topic** - One topic per file
5. **Include examples** - Show, don't just tell

### For Skill Users (Claude)

1. **Load skills proactively** - Don't wait until you need them
2. **Read referenced files** - When skill mentions them
3. **Follow guidelines strictly** - Especially for project-principles
4. **Reference skills in explanations** - Tell user what you're following

## Adding New Skills

To create a new skill:

1. **Create directory**: `.claude/skills/my-skill/`
2. **Create SKILL.md** with frontmatter:
   ```yaml
   ---
   name: My Skill
   description: What this skill does and when to use it
   ---
   ```
3. **Add content** following progressive disclosure
4. **Create additional files** as needed
5. **Reference files** from SKILL.md

## Skill vs Sub-agent

**Use Skills when:**
- Need knowledge/context
- Providing guidelines/standards
- Teaching "how to do something"
- Want content added to main context

**Use Sub-agents when:**
- Need independent execution
- Complex multi-step workflows
- Parallel processing
- Isolated context required

**Both can be combined:**
Sub-agents can load and use Skills for domain knowledge!

## Maintenance

### Updating Skills

Skills should be updated when:
- Project standards change
- New best practices emerge
- Examples become outdated
- Feedback reveals gaps

### Keeping Skills Current

- Review quarterly
- Update after major project changes
- Add examples from real scenarios
- Remove obsolete guidance

## Examples

### Using Conventional Commits

```
User: "Commit this bug fix"

Claude process:
1. Load conventional-commits/SKILL.md
2. Analyze changes
3. Apply core rules
4. Generate: "fix: resolve database timeout issue"
```

### Using Project Principles

```
User: "Add error handling to API route"

Claude process:
1. Load project-principles/SKILL.md
2. Read no-defensive.md
3. Apply principle: avoid defensive programming
4. Write code without unnecessary try/catch
```

## Resources

- [Anthropic Agent Skills Article](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude Documentation](https://docs.claude.com)

## Structure

```
.claude/skills/
├── README.md (this file)
├── conventional-commits/
│   ├── SKILL.md
│   ├── types.md
│   ├── release-triggers.md
│   └── examples.md
└── project-principles/
    ├── SKILL.md
    ├── yagni.md
    ├── no-defensive.md
    ├── type-safety.md
    └── zero-lint.md
```

## Status

✅ Conventional Commits - Ready
✅ Project Principles - Ready
🚧 More skills coming soon...
