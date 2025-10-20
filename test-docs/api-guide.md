# API Usage Guide

## Authentication

The uSpark API uses token-based authentication. You can obtain a token through the CLI or web interface.

### Setting Up Authentication

**Environment Variable:**
```bash
export USPARK_TOKEN="your-token-here"
export USPARK_PROJECT_ID="your-project-id"
export USPARK_API_URL="https://api.uspark.ai"
```

**Configuration File:**
The CLI stores credentials in `~/.uspark/config.json`:

```json
{
  "token": "your-token-here",
  "apiUrl": "https://api.uspark.ai",
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  }
}
```

## API Endpoints

### Projects

**List Projects**
```
GET /api/projects
```

**Get Project Details**
```
GET /api/projects/:projectId
```

**Create Project**
```
POST /api/projects
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description"
}
```

### Sessions

**Create Session**
```
POST /api/projects/:projectId/sessions
```

**Get Session**
```
GET /api/projects/:projectId/sessions/:sessionId
```

### Files

**List Files**
```
GET /api/projects/:projectId/files
```

**Upload File**
```
POST /api/projects/:projectId/files
Content-Type: multipart/form-data
```

**Download File**
```
GET /api/projects/:projectId/files/:fileId
```

## Rate Limiting

The API implements rate limiting:
- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated requests

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

Common error codes:
- `UNAUTHORIZED` - Invalid or missing authentication token
- `NOT_FOUND` - Resource not found
- `RATE_LIMITED` - Too many requests
- `VALIDATION_ERROR` - Invalid input data
