const { readState, validateState, writeState } = require("../lib/state-store");

module.exports = async function handler(request, response) {
  try {
    if (request.method === "GET") {
      sendJson(response, 200, await readState());
      return;
    }

    if (request.method === "PUT") {
      const state = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
      validateState(state);
      await writeState(state);
      sendJson(response, 200, { ok: true });
      return;
    }

    response.setHeader("Allow", "GET, PUT");
    sendText(response, 405, "Method not allowed");
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendText(response, statusCode, error.message || "Internal server error");
  }
};

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function sendText(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.end(body);
}
