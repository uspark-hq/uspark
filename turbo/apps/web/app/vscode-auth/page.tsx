import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { generateVSCodeToken } from "./actions";

interface PageProps {
  searchParams: Promise<{ state?: string }>;
}

export default async function VSCodeAuthPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  const params = await searchParams;
  const state = params.state;

  // Redirect to sign-in if not authenticated
  if (!userId) {
    const redirectUrl = state
      ? `/vscode-auth?state=${encodeURIComponent(state)}`
      : "/vscode-auth";
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
  }

  // State parameter is required
  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-4 text-gray-700">
            Missing state parameter. Please try again from VSCode.
          </p>
        </div>
      </div>
    );
  }

  // Generate token
  const result = await generateVSCodeToken();

  if (!result.success || !result.token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-4 text-gray-700">
            {result.error || "Failed to generate authentication token"}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Please try again or contact support.
          </p>
        </div>
      </div>
    );
  }

  // Redirect to VSCode
  const vscodeUri = `vscode://uSpark.uspark-sync/auth-callback?token=${encodeURIComponent(result.token)}&state=${encodeURIComponent(state)}`;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-green-600">
          Authentication Successful!
        </h1>
        <p className="mt-4 text-gray-700">Redirecting back to VSCode...</p>
        <p className="mt-2 text-sm text-gray-500">
          If you are not redirected automatically,{" "}
          <a
            href={vscodeUri}
            className="text-blue-600 underline hover:text-blue-800"
          >
            click here
          </a>
          .
        </p>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              setTimeout(function() {
                window.location.href = ${JSON.stringify(vscodeUri)};
              }, 1000);
            `,
          }}
        />
      </div>
    </div>
  );
}
