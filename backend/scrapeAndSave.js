const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const pool = require("./db");

const UFC_NEWS_URL = "https://www.ufc.com/news";
const UFC_RANKINGS_URL = "https://www.ufc.com/rankings";
const UFC_EVENTS_URL = "https://www.ufc.com/events";

async function scrapeAndSaveNews() {
  console.log("Scraping news...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(UFC_NEWS_URL, { waitUntil: "networkidle2" });
  const content = await page.content();
  await browser.close();
  const $ = cheerio.load(content);

  const newsItems = [];
  $(".c-card--grid-card-trending")
    .slice(0, 6)
    .each((i, el) => {
      const title = $(el)
        .find(".c-card--grid-card-trending__headline")
        .text()
        .trim();
      const href = $(el).find("a").attr("href");
      const link = href ? new URL(href, UFC_NEWS_URL).href : "";
      const image = $(el).find("img").attr("src");
      const summary = $(el).find(".c-card__summary").text().trim();
      const date = $(el)
        .find(".c-card--grid-card-trending__info-suffix")
        .text()
        .trim();
      if (link) {
        newsItems.push([title, summary, image, date, link]);
      }
    });

  if (newsItems.length > 0) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM news");
      await connection.query(
        "INSERT INTO news (title, summary, image, date, link) VALUES ?",
        [newsItems]
      );
      await connection.commit();
      console.log(`${newsItems.length} news items saved to database.`);
    } catch (error) {
      await connection.rollback();
      console.error("Error saving news to DB:", error);
    } finally {
      connection.release();
    }
  }
}

async function scrapeAndSaveRankings() {
  console.log("Scraping rankings...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(UFC_RANKINGS_URL, { waitUntil: "networkidle2" });
  const content = await page.content();
  await browser.close();
  const $ = cheerio.load(content);

  const rankings = [];
  $(".view-grouping").each((i, group) => {
    const category = $(group).find(".view-grouping-header").text().trim();
    $(group)
      .find("tbody tr")
      .each((j, row) => {
        let rank = $(row).find(".views-field-weight-class-rank").text().trim();
        if (rank === "C") rank = "Champion";
        const name = $(row).find(".views-field-title a").text().trim();
        const relativeLink = $(row).find(".views-field-title a").attr("href");
        const link = relativeLink
          ? new URL(relativeLink, UFC_RANKINGS_URL).href
          : "";
        const image = $(row).find("img").attr("src") || "";
        if (name && category) {
          rankings.push([category, rank, name, link, image]);
        }
      });
  });

  if (rankings.length > 0) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM rankings");
      await connection.query(
        "INSERT INTO rankings (category, `rank`, name, link, image) VALUES ?",
        [rankings]
      );
      await connection.commit();
      console.log(`${rankings.length} ranking entries saved to database.`);
    } catch (error) {
      await connection.rollback();
      console.error("Error saving rankings to DB:", error);
    } finally {
      connection.release();
    }
  }
}

async function scrapeAndSaveEvents() {
  console.log("Scraping events...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(UFC_EVENTS_URL, { waitUntil: "networkidle2" });
  const content = await page.content();
  await browser.close();
  const $ = cheerio.load(content);

  const events = [];
  $(".c-card-event--result").each((i, el) => {
    const href = $(el).find(".c-card-event--result__headline a").attr("href");
    const link = href ? new URL(href, UFC_EVENTS_URL).href : "";
    const title = $(el).find(".c-card-event--result__headline").text().trim();
    const dateElement = $(el).find(".c-card-event--result__date");
    const date =
      dateElement.attr("data-prelims-card") ||
      dateElement.attr("data-main-card") ||
      "";
    const mainCardTime = dateElement.attr("data-main-card") || "";
    const location = $(el).find(".country").text().trim();
    const ticketLinkHref = $(el).find(".e-button--white").attr("href");
    const ticketLink = ticketLinkHref
      ? new URL(ticketLinkHref, UFC_EVENTS_URL).href
      : "";

    const fighters = [];
    $(el)
      .find(".c-card-event--result__headline")
      .each((i, fighterEl) => {
        fighters.push($(fighterEl).text().trim());
      });
    const mainEvent =
      fighters.length === 2 ? `${fighters[0]} vs ${fighters[1]}` : "TBD";

    if (title && link) {
      events.push([
        title,
        date,
        mainCardTime,
        location,
        mainEvent,
        link,
        ticketLink,
      ]);
    }
  });

  if (events.length > 0) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM events");
      await connection.query(
        "INSERT INTO events (title, date, main_card_time, location, main_event, link, ticket_link) VALUES ?",
        [events]
      );
      await connection.commit();
      console.log(`${events.length} events saved to database.`);
    } catch (error) {
      await connection.rollback();
      console.error("Error saving events to DB:", error);
    } finally {
      connection.release();
    }
  }
}

async function runAllScrapers() {
  try {
    await scrapeAndSaveNews();
    await scrapeAndSaveRankings();
    await scrapeAndSaveEvents();
    console.log("All scraping and saving tasks completed.");
  } catch (error) {
    console.error("An error occurred during the scraping process:", error);
  } finally {
    await pool.end();
    console.log("MySQL pool closed.");
  }
}

if (require.main === module) {
  runAllScrapers();
}

module.exports = {
  scrapeAndSaveNews,
  scrapeAndSaveRankings,
  scrapeAndSaveEvents,
  runAllScrapers,
};
