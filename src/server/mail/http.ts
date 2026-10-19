import "server-only";
import { ok } from "@/domain/result";
import { type MailResult, mailFailed } from "./mailer";

export type MailPost = {
  url: string;
  headers: Record<string, string>;
  body: string | URLSearchParams;
};

export async function postMail(
  provider: string,
  fetchImpl: typeof fetch,
  post: MailPost,
): Promise<MailResult> {
  try {
    const response = await fetchImpl(post.url, {
      method: "POST",
      headers: post.headers,
      body: post.body,
    });

    await response.body?.cancel();

    return response.ok ? ok(undefined) : mailFailed(provider, `status ${response.status}`);
  } catch (error) {
    return mailFailed(provider, error instanceof Error ? error.message : "unknown error");
  }
}
