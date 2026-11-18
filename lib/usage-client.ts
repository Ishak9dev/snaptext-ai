export async function consumeLocalToolUsage(toolId: string): Promise<string> {
  const response = await fetch("/api/usage/consume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.reservationId !== "string") {
    const error = new Error(payload.error || "Unable to verify your tool usage.");
    (error as Error & { code?: string }).code = payload.code;
    throw error;
  }
  return payload.reservationId;
}

export async function completeLocalToolUsage(reservationId: string): Promise<void> {
  const response = await fetch("/api/usage/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservationId }),
  });
  if (!response.ok) throw new Error("Unable to finalize tool usage. Please retry.");
}

export async function releaseLocalToolUsage(reservationId: string): Promise<void> {
  const response = await fetch("/api/usage/release", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservationId }),
  });
  if (!response.ok) {
    throw new Error("Unable to release tool usage. Please try again.");
  }
}
