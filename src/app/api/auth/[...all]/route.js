export const runtime = "nodejs";

async function handleRequest(request, method) {
  try {
    const { auth, toNextJsHandler } = await import("@/lib/auth").then((module) =>
      module.getAuth()
    );
    const handlers = toNextJsHandler(auth);
    return handlers[method](request);
  } catch (error) {
    console.error(`[auth] ${method} handler failure:`, error);
    throw error;
  }
}

export const GET = (request) => handleRequest(request, "GET");
export const POST = (request) => handleRequest(request, "POST");
export const PATCH = (request) => handleRequest(request, "PATCH");
export const PUT = (request) => handleRequest(request, "PUT");
export const DELETE = (request) => handleRequest(request, "DELETE");
