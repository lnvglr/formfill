import { NextResponse } from "next/server";
import {
  translateFormContent,
  type FormContentToTranslate,
} from "@/lib/ai/translate-form-content";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      locale?: string;
      form_title?: string;
      questions?: FormContentToTranslate["questions"];
      repeatable_groups?: FormContentToTranslate["repeatable_groups"];
    };

    const { locale, form_title, questions = [], repeatable_groups = [] } = body;

    if (!locale || !isLocale(locale)) {
      return NextResponse.json(
        { error: "Ungültige Sprache" },
        { status: 400 }
      );
    }

    const translated = await translateFormContent(locale, {
      form_title,
      questions,
      repeatable_groups,
    });

    return NextResponse.json(translated);
  } catch (error) {
    console.error("Translate form content error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Übersetzung fehlgeschlagen",
      },
      { status: 500 }
    );
  }
}
