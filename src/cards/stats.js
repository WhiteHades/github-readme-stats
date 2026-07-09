// @ts-check

import { Card } from "../common/Card.js";
import { getCardColors } from "../common/color.js";
import { kFormatter } from "../common/fmt.js";
import { I18n } from "../common/I18n.js";
import { icons } from "../common/icons.js";
import { clampValue } from "../common/ops.js";
import { flexLayout, measureText } from "../common/render.js";
import { statCardLocales, wakatimeCardLocales } from "../translations.js";

const CARD_MIN_WIDTH = 287;
const CARD_DEFAULT_WIDTH = 287;
const RANK_CARD_MIN_WIDTH = 420;
const RANK_CARD_DEFAULT_WIDTH = 450;
const RANK_ONLY_CARD_MIN_WIDTH = 290;
const RANK_ONLY_CARD_DEFAULT_WIDTH = 290;

/**
 * Long locales that need more space for text. Keep sorted alphabetically.
 *
 * @type {(keyof typeof wakatimeCardLocales["wakatimecard.title"])[]}
 */
const LONG_LOCALES = [
  "az",
  "bg",
  "cs",
  "de",
  "el",
  "es",
  "fil",
  "fi",
  "fr",
  "hu",
  "id",
  "ja",
  "ml",
  "my",
  "nl",
  "pl",
  "pt-br",
  "pt-pt",
  "ru",
  "sr",
  "sr-latn",
  "sw",
  "ta",
  "uk-ua",
  "uz",
  "zh-tw",
];

/**
 * Create a stats card text item.
 *
 * @param {object} params Object that contains the createTextNode parameters.
 * @param {string} params.icon The icon to display.
 * @param {string} params.label The label to display.
 * @param {number} params.value The value to display.
 * @param {string} params.id The id of the stat.
 * @param {string=} params.unitSymbol The unit symbol of the stat.
 * @param {number} params.index The index of the stat.
 * @param {boolean} params.showIcons Whether to show icons.
 * @param {number} params.shiftValuePos Number of pixels the value has to be shifted to the right.
 * @param {boolean} params.bold Whether to bold the label.
 * @param {string} params.numberFormat The format of numbers on card.
 * @param {number=} params.numberPrecision The precision of numbers on card.
 * @returns {string} The stats card text item SVG object.
 */
const createTextNode = ({
  icon,
  label,
  value,
  id,
  unitSymbol,
  index,
  showIcons,
  shiftValuePos,
  bold,
  numberFormat,
  numberPrecision,
}) => {
  const precision =
    typeof numberPrecision === "number" && !isNaN(numberPrecision)
      ? clampValue(numberPrecision, 0, 2)
      : undefined;
  const kValue =
    numberFormat.toLowerCase() === "long" || id === "prs_merged_percentage"
      ? value
      : kFormatter(value, precision);
  const staggerDelay = (index + 3) * 150;

  const labelOffset = showIcons ? `x="25"` : "";
  const iconSvg = showIcons
    ? `
    <svg data-testid="icon" class="icon" viewBox="0 0 16 16" version="1.1" width="16" height="16">
      ${icon}
    </svg>
  `
    : "";
  return `
    <g class="stagger" style="animation-delay: ${staggerDelay}ms" transform="translate(25, 0)">
      ${iconSvg}
      <text class="stat ${
        bold ? " bold" : "not_bold"
      }" ${labelOffset} y="12.5">${label.toLowerCase()}:</text>
      <text
        class="stat ${bold ? " bold" : "not_bold"}"
        x="${(showIcons ? 140 : 120) + shiftValuePos}"
        y="12.5"
        data-testid="${id}"
      >${String(kValue).toLowerCase()}${unitSymbol ? ` ${unitSymbol}` : ""}</text>
    </g>
  `;
};

/**
 * Retrieves CSS styles for a card.
 *
 * @param {Object} colors The colors to use for the card.
 * @param {string} colors.titleColor The title color.
 * @param {string} colors.textColor The text color.
 * @param {string} colors.iconColor The icon color.
 * @param {boolean} colors.show_icons Whether to show icons.
 * @returns {string} Card CSS styles.
 */
const getStyles = ({ titleColor, textColor, iconColor, show_icons }) => {
  return `
    .header {
      font: 600 20px 'JetBrains Mono', 'Segoe UI', Ubuntu, Sans-Serif;
      fill: ${titleColor};
    }
    @supports(-moz-appearance: auto) {
      /* Selector detects Firefox */
      .header { font-size:17.5px; }
    }
    .stat {
      font: 600 16px 'JetBrains Mono', 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif; fill: ${textColor};
    }
    @supports(-moz-appearance: auto) {
      /* Selector detects Firefox */
      .stat { font-size:14px; }
    }
    .stagger {
      opacity: 0;
      animation: fadeInAnimation 0.3s ease-in-out forwards;
    }
    .not_bold { font-weight: 400 }
    .bold { font-weight: 700 }
    .icon {
      fill: ${iconColor};
      display: ${show_icons ? "block" : "none"};
    }
  `;
};

/**
 * Return the label for commits according to the selected options
 *
 * @param {boolean} include_all_commits Option to include all years
 * @param {number|undefined} commits_year Option to include only selected year
 * @param {I18n} i18n The I18n instance.
 * @returns {string} The label corresponding to the options.
 */
const getTotalCommitsYearLabel = (include_all_commits, commits_year, i18n) =>
  include_all_commits
    ? ""
    : commits_year
      ? ` (${commits_year})`
      : ` (${i18n.t("wakatimecard.lastyear")})`;

/**
 * @typedef {import('../fetchers/types').StatsData} StatsData
 * @typedef {import('./types').StatCardOptions} StatCardOptions
 */

/**
 * Renders the stats card.
 *
 * @param {StatsData} stats The stats data.
 * @param {Partial<StatCardOptions>} options The card options.
 * @returns {string} The stats card SVG object.
 */
const renderStatsCard = (stats, options = {}) => {
  const {
    name,
    totalStars,
    totalCommits,
    totalIssues,
    totalPRs,
    totalPRsMerged,
    mergedPRsPercentage,
    totalReviews,
    totalDiscussionsStarted,
    totalDiscussionsAnswered,
    contributedTo,
  } = stats;
  const {
    hide = [],
    show_icons = false,
    hide_title = false,
    hide_border = false,
    card_width,
    include_all_commits = false,
    commits_year,
    line_height = 25,
    title_color,
    icon_color,
    text_color,
    text_bold = true,
    bg_color,
    theme = "default",
    custom_title,
    border_radius,
    border_color,
    number_format = "short",
    number_precision,
    locale,
    disable_animations = false,
    show = [],
    hide_rank = false,
    rank_gif,
  } = options;

  const lheight = parseInt(String(line_height), 10);

  const shouldHideRank = hide_rank === true;

  // returns theme based colors with proper overrides and defaults
  const { titleColor, iconColor, textColor, bgColor, borderColor } =
    getCardColors({
      title_color,
      text_color,
      icon_color,
      bg_color,
      border_color,
      theme,
    });

  const apostrophe = /s$/i.test(name.trim()) ? "" : "s";
  const i18n = new I18n({
    locale,
    translations: {
      ...statCardLocales({ name, apostrophe }),
      ...wakatimeCardLocales,
    },
  });

  // Meta data for creating text nodes with createTextNode function
  const STATS = {};

  STATS.stars = {
    icon: icons.star,
    label: i18n.t("statcard.totalstars"),
    value: totalStars,
    id: "stars",
  };
  STATS.commits = {
    icon: icons.commits,
    label: `${i18n.t("statcard.commits")}${getTotalCommitsYearLabel(
      include_all_commits,
      commits_year,
      i18n,
    )}`,
    value: totalCommits,
    id: "commits",
  };
  STATS.prs = {
    icon: icons.prs,
    label: i18n.t("statcard.prs"),
    value: totalPRs,
    id: "prs",
  };

  if (show.includes("prs_merged")) {
    STATS.prs_merged = {
      icon: icons.prs_merged,
      label: i18n.t("statcard.prs-merged"),
      value: totalPRsMerged,
      id: "prs_merged",
    };
  }

  if (show.includes("prs_merged_percentage")) {
    STATS.prs_merged_percentage = {
      icon: icons.prs_merged_percentage,
      label: i18n.t("statcard.prs-merged-percentage"),
      value: mergedPRsPercentage.toFixed(
        typeof number_precision === "number" && !isNaN(number_precision)
          ? clampValue(number_precision, 0, 2)
          : 2,
      ),
      id: "prs_merged_percentage",
      unitSymbol: "%",
    };
  }

  if (show.includes("reviews")) {
    STATS.reviews = {
      icon: icons.reviews,
      label: i18n.t("statcard.reviews"),
      value: totalReviews,
      id: "reviews",
    };
  }

  STATS.issues = {
    icon: icons.issues,
    label: i18n.t("statcard.issues"),
    value: totalIssues,
    id: "issues",
  };

  if (show.includes("discussions_started")) {
    STATS.discussions_started = {
      icon: icons.discussions_started,
      label: i18n.t("statcard.discussions-started"),
      value: totalDiscussionsStarted,
      id: "discussions_started",
    };
  }
  if (show.includes("discussions_answered")) {
    STATS.discussions_answered = {
      icon: icons.discussions_answered,
      label: i18n.t("statcard.discussions-answered"),
      value: totalDiscussionsAnswered,
      id: "discussions_answered",
    };
  }

  STATS.contribs = {
    icon: icons.contribs,
    label: i18n.t("statcard.contribs"),
    value: contributedTo,
    id: "contribs",
  };

  // @ts-ignore
  const isLongLocale = locale ? LONG_LOCALES.includes(locale) : false;

  // filter out hidden stats defined by user & create the text nodes
  const statItems = Object.keys(STATS)
    .filter((key) => !hide.includes(key))
    .map((key, index) => {
      // @ts-ignore
      const stats = STATS[key];

      // create the text nodes, and pass index so that we can calculate the line spacing
      return createTextNode({
        icon: stats.icon,
        label: stats.label,
        value: stats.value,
        id: stats.id,
        unitSymbol: stats.unitSymbol,
        index,
        showIcons: show_icons,
        shiftValuePos: 79.01 + (isLongLocale ? 50 : 0),
        bold: text_bold,
        numberFormat: number_format,
        numberPrecision: number_precision,
      });
    });

  // Calculate the card height depending on how many items there are
  let height = Math.max(
    45 + (statItems.length + 1) * lheight,
    statItems.length ? 150 : 180,
  );

  const cssStyles = getStyles({
    titleColor,
    textColor,
    iconColor,
    show_icons,
  });

  const calculateTextWidth = () => {
    return measureText(
      custom_title
        ? custom_title
        : statItems.length
          ? i18n.t("statcard.title")
          : i18n.t("statcard.ranktitle"),
    );
  };

  /*
    When shouldHideRank=true, the minimum card width is 270 px + the title length and padding.
    When shouldHideRank=false, the minimum card_width is 340 px + the icon width (if show_icons=true).
    Numbers are picked by looking at existing dimensions on production.
  */
  const iconWidth = show_icons && statItems.length ? 16 + /* padding */ 1 : 0;
  const minCardWidth =
    (shouldHideRank
      ? clampValue(
          50 /* padding */ + calculateTextWidth(),
          CARD_MIN_WIDTH,
          Infinity,
        )
      : statItems.length
        ? RANK_CARD_MIN_WIDTH
        : RANK_ONLY_CARD_MIN_WIDTH) + iconWidth;
  const defaultCardWidth =
    (shouldHideRank
      ? CARD_DEFAULT_WIDTH
      : statItems.length
        ? RANK_CARD_DEFAULT_WIDTH
        : RANK_ONLY_CARD_DEFAULT_WIDTH) + iconWidth;
  let width = card_width
    ? isNaN(card_width)
      ? defaultCardWidth
      : card_width
    : defaultCardWidth;
  if (width < minCardWidth) {
    width = minCardWidth;
  }

  const card = new Card({
    customTitle: custom_title?.toLowerCase(),
    defaultTitle: (statItems.length
      ? i18n.t("statcard.title")
      : i18n.t("statcard.ranktitle")
    ).toLowerCase(),
    width,
    height,
    border_radius,
    colors: {
      titleColor,
      textColor,
      iconColor,
      bgColor,
      borderColor,
    },
  });

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS(cssStyles);

  if (disable_animations) {
    card.disableAnimations();
  }

  // Conditionally rendered elements
  const rankCircle = rank_gif
    ? `<g data-testid="rank-circle" transform="translate(${width / 2 - 40}, ${height / 2 - 50})">
        <image href="${rank_gif}" x="-50" y="-32" width="80" height="80" />
       </g>`
    : "";

  // Accessibility Labels
  const labels = Object.keys(STATS)
    .filter((key) => !hide.includes(key))
    .map((key) => {
      // @ts-ignore
      const stats = STATS[key];
      if (key === "commits") {
        return `${i18n.t("statcard.commits")} ${getTotalCommitsYearLabel(
          include_all_commits,
          commits_year,
          i18n,
        )} : ${stats.value}`;
      }
      return `${stats.label}: ${stats.value}`;
    })
    .join(", ");

  card.setAccessibilityLabel({
    title: card.title,
    desc: labels.toLowerCase(),
  });

  return card.render(`
    ${rankCircle}
    <svg x="0" y="0">
      ${flexLayout({
        items: statItems,
        gap: lheight,
        direction: "column",
      }).join("")}
    </svg>
  `);
};

export { renderStatsCard };
export default renderStatsCard;
