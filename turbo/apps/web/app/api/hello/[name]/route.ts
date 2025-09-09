import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const greetings = {
  en: "Hello",
  zh: "你好",
  ja: "こんにちは",
  es: "Hola",
} as const;

// Define schemas for validation (from hello contract)
const PathParamsSchema = z.object({
  name: z.string().min(1),
});

const QueryParamsSchema = z.object({
  lang: z.enum(["en", "zh", "ja", "es"]).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const params = await context.params;

  // Validate path parameters
  const pathValidation = PathParamsSchema.safeParse(params);
  if (!pathValidation.success) {
    return NextResponse.json(
      {
        error: "Invalid path parameters",
        details: pathValidation.error.issues,
      },
      { status: 400 },
    );
  }

  // Validate query parameters
  const searchParams = request.nextUrl.searchParams;
  const queryParams = {
    lang: searchParams.get("lang") || undefined,
  };

  const queryValidation = QueryParamsSchema.safeParse(queryParams);
  if (!queryValidation.success) {
    return NextResponse.json(
      {
        error: "Invalid query parameters",
        details: queryValidation.error.issues,
      },
      { status: 400 },
    );
  }

  const { name } = pathValidation.data;
  const lang = queryValidation.data.lang || "en";
  const greeting = greetings[lang];

  return NextResponse.json({
    greeting: `${greeting}, ${decodeURIComponent(name)}!`,
    name: decodeURIComponent(name),
    language: lang,
  });
}
