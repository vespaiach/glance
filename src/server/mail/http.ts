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

    if (response.ok) return ok(undefined);

    return mailFailed(provider, new Error(`status ${response.status}`), response.status);
  } catch (error) {
    return mailFailed(provider, error);
  }
}
