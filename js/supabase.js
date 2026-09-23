const RPC_ENDPOINT = "/api/rpc";

function createRpcRequest(functionName, params) {
  let range;

  const request = {
    range(start, end) {
      range = { start, end };
      return request;
    },
    then(onFulfilled, onRejected) {
      return executeRpc(functionName, params, range).then(onFulfilled, onRejected);
    }
  };

  return request;
}

async function executeRpc(functionName, params, range) {
  const safeParams = { ...params };
  if (functionName !== "restore_session") delete safeParams.p_session_token;

  const headers = { "Content-Type": "application/json", "X-App-Request": "1" };
  if (range) {
    headers.Range = `${range.start}-${range.end}`;
    headers["Range-Unit"] = "items";
  }

  try {
    const response = await fetch(RPC_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify({ functionName, params: safeParams })
    });
    const responseText = await response.text();
    const result = responseText ? JSON.parse(responseText) : null;

    if (!response.ok) {
      return { data: null, error: result.error ?? { message: "La solicitud no se pudo completar." } };
    }

    return { data: result?.data ?? null, error: null };
  } catch (error) {
    return { data: null, error: { message: error.message || "No se pudo conectar con el servidor." } };
  }
}

export const supabase = {
  rpc: createRpcRequest
};
