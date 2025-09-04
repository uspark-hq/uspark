# Code Review Command

A comprehensive code review tool that analyzes commits and generates detailed reviews.

## Usage

```bash
/code-review [pr-id|commit-id|description]
```

## Parameters

- `pr-id`: GitHub PR number (e.g., `123`)
- `commit-id`: Single commit hash or range (e.g., `abc123` or `abc123..def456`)  
- `description`: Natural language description of code range to review

## Examples

```bash
/code-review 123
/code-review abc123..def456
/code-review "review authentication changes in the last week"
```

## Workflow

The command follows this automated workflow:

1. **Parse Input**: Determine if input is PR ID, commit ID, or description
2. **Generate Commit List**: Create `commit-list.md` with checkboxes for each commit
3. **Review Each Commit**: For each commit, analyze:
   - New mocks and alternatives
   - Test coverage quality
   - Unnecessary try/catch blocks and over-engineering
   - Key interface changes
   - Timer and delay usage patterns
4. **Generate Reviews**: Create individual `review-{commit}.md` files
5. **Update Commit List**: Replace checkboxes with links to review files
6. **Summary**: Generate overall review summary

## Review Criteria

Each commit is reviewed against these criteria:

### 1. Mock Analysis
- Identify new mock implementations
- Suggest non-mock alternatives where possible
- List all new mocks for user review

### 2. Test Coverage
- Evaluate test quality and completeness
- Check for missing test scenarios
- Assess test maintainability

### 3. Error Handling
- Identify unnecessary try/catch blocks
- Suggest fail-fast improvements
- Flag over-engineered error handling

### 4. Interface Changes
- Document new/modified public interfaces
- Highlight breaking changes
- Review API design decisions

### 5. Timer and Delay Analysis
- Identify artificial delays and timers in production code
- Check for advancedTimer or fakeTimer usage in tests
- Flag timeout increases to pass tests
- Suggest deterministic alternatives to time-based solutions

## Output Structure

```
commit-list.md           # Master checklist with links to reviews
├── review-abc123.md     # Individual commit review
├── review-def456.md     # Individual commit review
└── ...                  # One review per commit
```

## Implementation Notes

- Uses GitHub CLI for PR information when available
- Supports both single commits and commit ranges
- Automatically detects commit boundaries for natural language inputs
- Generates structured markdown output for easy navigation