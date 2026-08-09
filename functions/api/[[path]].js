import gistHandler from "../../api/gist.js";
import statsHandler from "../../api/index.js";
import pinHandler from "../../api/pin.js";
import patInfoHandler from "../../api/status/pat-info.js";
import statusHandler from "../../api/status/up.js";
import topLanguagesHandler from "../../api/top-langs.js";
import wakatimeHandler from "../../api/wakatime.js";

const handlers = {
  "/api": statsHandler,
  "/api/gist": gistHandler,
  "/api/pin": pinHandler,
  "/api/status/pat-info": patInfoHandler,
  "/api/status/up": statusHandler,
  "/api/top-langs": topLanguagesHandler,
  "/api/wakatime": wakatimeHandler,
};

const createResponseAdapter = () => {
  const headers = new Headers();
  let body;
  let status = 200;

  const response = {
    setHeader(name, value) {
      headers.set(name, value);
      return response;
    },
    status(code) {
      status = code;
      return response;
    },
    send(value) {
      body =
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : String(value);
      return value;
    },
  };

  return {
    response,
    toResponse: () => new Response(body, { headers, status }),
  };
};

export const onRequest = async ({ request }) => {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const handler = handlers[pathname];

  if (!handler) {
    return new Response("Not found", { status: 404 });
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed", {
      headers: { Allow: "GET, HEAD" },
      status: 405,
    });
  }

  const adapter = createResponseAdapter();
  await handler(
    {
      query: Object.fromEntries(url.searchParams),
    },
    adapter.response,
  );

  return adapter.toResponse();
};
