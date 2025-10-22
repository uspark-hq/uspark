This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

This application requires the following environment variables to be configured:

- `DATABASE_URL` - PostgreSQL database connection string
- `CLERK_SECRET_KEY` - Clerk authentication secret key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `E2B_API_KEY` - E2B sandbox API key
- `GH_APP_ID` - GitHub App ID
- `GH_APP_PRIVATE_KEY` - GitHub App private key
- `GH_WEBHOOK_SECRET` - GitHub webhook secret
- `DEFAULT_CLAUDE_TOKEN` - Default Claude API token
- `CRON_SECRET` - Secret token for authenticating Vercel Cron requests (production only)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token for file content access

For local development, copy `.env.local.example` to `.env.local` and fill in the values.

## Cron Sessions

This application supports automatic cron sessions that execute tasks on a schedule. The system automatically manages cron sessions based on the presence of a `cron.md` file in your project.

### How It Works

Every 10 minutes, the system:

1. **Scans all projects** in the database
2. **Checks each project** for a `cron.md` file in its YJS filesystem
3. **For projects with cron.md**:
   - Automatically creates or reuses a cron session (type: "cron")
   - Checks if the last turn in the cron session is still running
   - If the last turn is not running (or no turns exist), creates a new turn
   - Uses the content of `cron.md` as the prompt for the new turn

### Setup

1. **Configure environment variable** (production only):

   ```bash
   CRON_SECRET=<random-secure-token>
   ```

2. **Add cron.md to your project**:
   - Create a file named `cron.md` in your project's YJS filesystem
   - Write the prompt you want to execute every 10 minutes

3. **That's it!** The system will automatically:
   - Create a cron session for your project
   - Execute the prompt every 10 minutes (if previous turn completed)

### Example cron.md

```markdown
Check project status and run all tests. Report any failures or issues found.
Ensure code quality standards are maintained.
```

### Notes

- The cron job is configured in `vercel.json` and only runs in **production** (Vercel deployment)
- Cron schedule: `*/10 * * * *` (every 10 minutes)
- Multiple projects can each have their own `cron.md` and cron session
- To stop cron execution: simply delete or rename the `cron.md` file
- The system prevents overlapping executions (waits for previous turn to complete)
- Cron sessions are automatically created, no manual session creation needed

### Performance

The cron job uses **cursor-based pagination** to efficiently process projects:

- Processes projects in batches of 100
- Uses ID-based cursor for efficient database queries
- Avoids loading all projects into memory at once
- Continues processing until all projects are checked
- Suitable for systems with thousands of projects
