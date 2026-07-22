// @ts-check

import { renderTopLanguages } from "../src/cards/top-languages.js";
import { guardAccess } from "../src/common/access.js";
import {
  CACHE_TTL,
  resolveCacheSeconds,
  setCacheHeaders,
  setErrorCacheHeaders,
} from "../src/common/cache.js";
import {
  MissingParamError,
  retrieveSecondaryMessage,
} from "../src/common/error.js";
import { parseArray, parseBoolean } from "../src/common/ops.js";
import { renderError } from "../src/common/render.js";
import { fetchTopLanguages } from "../src/fetchers/top-languages.js";
import { isLocaleAvailable } from "../src/translations.js";

const HIDDEN_LANGUAGES = ["Vue", "HTML", "CSS", "SCSS", "JavaScript"];
const LANGUAGE_COMPLEXITY_WEIGHTS = {
  assembly: 1.25,
  c: 1.25,
  "c++": 1.25,
  cmake: 1.25,
  csharp: 0.75,
  cuda: 1.25,
  dart: 0.75,
  elixir: 0.75,
  "f#": 0.75,
  fortran: 1.25,
  go: 0.75,
  haskell: 0.75,
  java: 0.75,
  javascript: 0.75,
  julia: 0.75,
  kotlin: 0.75,
  lua: 0.75,
  makefile: 1.25,
  matlab: 0.75,
  "objective-c": 1.25,
  perl: 0.75,
  php: 0.75,
  python: 0.75,
  r: 0.75,
  ruby: 0.75,
  rust: 1.25,
  scala: 0.75,
  swift: 0.75,
  typescript: 0.75,
  "visual basic .net": 0.75,
  vhdl: 1.25,
  zig: 1.25,
};

/**
 * Apply the instance-wide language-complexity multipliers to card scores.
 *
 * @param {import("../src/fetchers/types").TopLangData} topLangs Fetched language scores.
 * @returns {import("../src/fetchers/types").TopLangData} Weighted language scores.
 */
const applyLanguageComplexityWeights = (topLangs) => {
  return Object.fromEntries(
    Object.entries(topLangs).map(([name, language]) => [
      name,
      {
        ...language,
        size:
          language.size *
          (LANGUAGE_COMPLEXITY_WEIGHTS[language.name.toLowerCase()] ?? 1),
      },
    ]),
  );
};

// @ts-ignore
export default async (req, res) => {
  const {
    username,
    hide,
    hide_title,
    hide_border,
    card_width,
    title_color,
    text_color,
    bg_color,
    theme,
    cache_seconds,
    layout,
    langs_count,
    exclude_repo,
    size_weight,
    count_weight,
    custom_title,
    locale,
    border_radius,
    border_color,
    disable_animations,
    hide_progress,
    stats_format,
    single_column,
  } = req.query;
  res.setHeader("Content-Type", "image/svg+xml");

  const access = guardAccess({
    res,
    id: username,
    type: "username",
    colors: {
      title_color,
      text_color,
      bg_color,
      border_color,
      theme,
    },
  });
  if (!access.isPassed) {
    return access.result;
  }

  if (locale && !isLocaleAvailable(locale)) {
    return res.send(
      renderError({
        message: "Something went wrong",
        secondaryMessage: "Locale not found",
        renderOptions: {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        },
      }),
    );
  }

  if (
    layout !== undefined &&
    (typeof layout !== "string" ||
      !["compact", "normal", "donut", "donut-vertical", "pie"].includes(layout))
  ) {
    return res.send(
      renderError({
        message: "Something went wrong",
        secondaryMessage: "Incorrect layout input",
        renderOptions: {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        },
      }),
    );
  }

  if (
    stats_format !== undefined &&
    (typeof stats_format !== "string" ||
      !["bytes", "percentages"].includes(stats_format))
  ) {
    return res.send(
      renderError({
        message: "Something went wrong",
        secondaryMessage: "Incorrect stats_format input",
        renderOptions: {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        },
      }),
    );
  }

  try {
    const topLangs = applyLanguageComplexityWeights(
      await fetchTopLanguages(
        username,
        parseArray(exclude_repo),
        size_weight,
        count_weight,
      ),
    );
    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.TOP_LANGS_CARD.DEFAULT,
      min: CACHE_TTL.TOP_LANGS_CARD.MIN,
      max: CACHE_TTL.TOP_LANGS_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderTopLanguages(topLangs, {
        custom_title,
        hide_title: parseBoolean(hide_title),
        hide_border: parseBoolean(hide_border),
        card_width: parseInt(card_width, 10),
        hide: [...HIDDEN_LANGUAGES, ...parseArray(hide)],
        title_color,
        text_color,
        bg_color,
        theme,
        layout,
        langs_count,
        border_radius,
        border_color,
        locale: locale ? locale.toLowerCase() : null,
        disable_animations: parseBoolean(disable_animations),
        hide_progress: parseBoolean(hide_progress),
        stats_format,
        single_column: parseBoolean(single_column),
      }),
    );
  } catch (err) {
    setErrorCacheHeaders(res);
    if (err instanceof Error) {
      return res.send(
        renderError({
          message: err.message,
          secondaryMessage: retrieveSecondaryMessage(err),
          renderOptions: {
            title_color,
            text_color,
            bg_color,
            border_color,
            theme,
            show_repo_link: !(err instanceof MissingParamError),
          },
        }),
      );
    }
    return res.send(
      renderError({
        message: "An unknown error occurred",
        renderOptions: {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        },
      }),
    );
  }
};

export { applyLanguageComplexityWeights };
