// @ts-check

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import "@testing-library/jest-dom";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import topLangs from "../api/top-langs.js";
import { renderTopLanguages } from "../src/cards/top-languages.js";
import { renderError } from "../src/common/render.js";
import { CACHE_TTL, DURATIONS } from "../src/common/cache.js";

const data_langs = {
  data: {
    user: {
      repositories: {
        nodes: [
          {
            languages: {
              edges: [{ size: 150, node: { color: "#0f0", name: "HTML" } }],
            },
          },
          {
            languages: {
              edges: [{ size: 100, node: { color: "#0f0", name: "HTML" } }],
            },
          },
          {
            languages: {
              edges: [
                { size: 100, node: { color: "#0ff", name: "javascript" } },
              ],
            },
          },
          {
            languages: {
              edges: [
                { size: 100, node: { color: "#0ff", name: "javascript" } },
              ],
            },
          },
        ],
      },
    },
  },
};

const error = {
  errors: [
    {
      type: "NOT_FOUND",
      path: ["user"],
      locations: [],
      message: "Could not fetch user",
    },
  ],
};

const langs = {
  HTML: {
    color: "#0f0",
    name: "HTML",
    size: 250,
  },
  javascript: {
    color: "#0ff",
    name: "javascript",
    size: 200,
  },
};

const mock = new MockAdapter(axios);

afterEach(() => {
  mock.reset();
});

describe("Test /api/top-langs", () => {
  it("should apply language weights and hide TeX", async () => {
    const languages = {
      C: { color: "#555", name: "C", size: 100 },
      "C++": { color: "#f34b7d", name: "C++", size: 100 },
      Rust: { color: "#dea584", name: "Rust", size: 100 },
      Python: { color: "#3572A5", name: "Python", size: 200 },
      TypeScript: { color: "#3178C6", name: "TypeScript", size: 300 },
      "Jupyter Notebook": {
        color: "#DA5B0B",
        name: "Jupyter Notebook",
        size: 400,
      },
      HTML: { color: "#0f0", name: "HTML", size: 500 },
      TeX: { color: "#3D6117", name: "TeX", size: 1000 },
    };
    const res = { setHeader: jest.fn(), send: jest.fn() };
    mock.onPost("https://api.github.com/graphql").reply(200, {
      data: {
        user: {
          repositories: {
            nodes: [
              {
                languages: {
                  edges: Object.values(languages).map(({ size, ...node }) => ({
                    size,
                    node,
                  })),
                },
              },
            ],
          },
        },
      },
    });

    await topLangs(
      { query: { username: "anuraghazra", langs_count: 10 } },
      res,
    );

    expect(res.send).toHaveBeenCalledWith(
      renderTopLanguages(
        {
          ...languages,
          C: { ...languages.C, size: 125 },
          "C++": { ...languages["C++"], size: 125 },
          Rust: { ...languages.Rust, size: 125 },
          Python: { ...languages.Python, size: 50 },
          TypeScript: { ...languages.TypeScript, size: 150 },
          "Jupyter Notebook": { ...languages["Jupyter Notebook"], size: 500 },
        },
        {
          langs_count: 10,
          hide: ["Vue", "HTML", "CSS", "SCSS", "JavaScript", "TeX"],
        },
      ),
    );
    expect(res.send.mock.calls[0][0]).toContain("jupyter notebook");
    expect(res.send.mock.calls[0][0]).not.toMatch(/>\s*tex\s*</i);
  });

  it("should test the request", async () => {
    const req = {
      query: {
        username: "anuraghazra",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderTopLanguages(langs, {
        hide: ["Vue", "HTML", "CSS", "SCSS", "JavaScript", "TeX"],
      }),
    );
  });

  it("should work with the query options", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        hide_title: true,
        card_width: 100,
        title_color: "fff",
        icon_color: "fff",
        text_color: "fff",
        bg_color: "fff",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderTopLanguages(langs, {
        hide: ["Vue", "HTML", "CSS", "SCSS", "JavaScript", "TeX"],
        hide_title: true,
        card_width: 100,
        title_color: "fff",
        icon_color: "fff",
        text_color: "fff",
        bg_color: "fff",
      }),
    );
  });

  it("should pass through single column compact layout", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        layout: "compact",
        single_column: "true",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderTopLanguages(langs, {
        hide: ["Vue", "HTML", "CSS", "SCSS", "JavaScript", "TeX"],
        layout: "compact",
        single_column: true,
      }),
    );
  });

  it("should render error card on user data fetch error", async () => {
    const req = {
      query: {
        username: "anuraghazra",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, error);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: error.errors[0].message,
        secondaryMessage:
          "Make sure the provided username is not an organization",
      }),
    );
  });

  it("should render error card on incorrect layout input", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        layout: ["pie"],
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: "Something went wrong",
        secondaryMessage: "Incorrect layout input",
      }),
    );
  });

  it("should render error card if username in blacklist", async () => {
    const req = {
      query: {
        username: "renovate-bot",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: "This username is blacklisted",
        secondaryMessage: "Please deploy your own instance",
        renderOptions: { show_repo_link: false },
      }),
    );
  });

  it("should render error card if wrong locale provided", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        locale: "asdf",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: "Something went wrong",
        secondaryMessage: "Locale not found",
      }),
    );
  });

  it("should have proper cache", async () => {
    const req = {
      query: {
        username: "anuraghazra",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      `max-age=${CACHE_TTL.TOP_LANGS_CARD.DEFAULT}, ` +
        `s-maxage=${CACHE_TTL.TOP_LANGS_CARD.DEFAULT}, ` +
        `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
    );
  });
});
