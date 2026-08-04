export async function sendRuntimeMessage<T>(message: unknown): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as
    | { ok: true; value: T }
    | { ok: false; error: string };
  if (!response?.ok) throw new Error(response?.error ?? "扩展通信失败");
  return response.value;
}
