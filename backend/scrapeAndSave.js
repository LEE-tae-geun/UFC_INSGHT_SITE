const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const pool = require("./db"); // 가정

const UFC_NEWS_URL = "https://www.ufc.com/news";
const UFC_RANKINGS_URL = "https://www.ufc.com/rankings";
const UFC_EVENTS_URL = "https://www.ufc.com/events";

// --------------------------------------------------------
// 1. 브라우저 환경 설정 함수: 모든 스크래퍼가 재사용
// --------------------------------------------------------
async function setupPage(browser, url) {
  const page = await browser.newPage();

  // 불필요한 리소스 차단 (속도 개선 핵심)
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const resourceType = req.resourceType();
    // 이미지, CSS, 폰트 차단
    if (
      resourceType === "image" ||
      resourceType === "stylesheet" ||
      resourceType === "font"
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // 대기 조건 변경 (networkidle2 대신 domcontentloaded)
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // HTML 콘텐츠 로드
  const content = await page.content();
  await page.close(); // 페이지 닫고 자원 해제

  return cheerio.load(content);
}

// --------------------------------------------------------
// 각 스크래퍼 함수 (브라우저 인스턴스를 인자로 받음)
// --------------------------------------------------------

async function scrapeAndSaveNews(browser) {
  console.log("Scraping news...");
  // Puppeteer.launch() / browser.close() 제거
  const $ = await setupPage(browser, UFC_NEWS_URL);

  // ... (기존의 Cheerio/DB 로직은 동일) ...
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
    // DB 저장 로직 (생략하지 않고 그대로 유지)
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM news");
      await connection.query(
        "INSERT INTO news (title, summary, image, date, link) VALUES ?",
        [newsItems]
      );
      await connection.commit();
      console.log(`✅ ${newsItems.length} news items saved to database.`);
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error saving news to DB:", error);
    } finally {
      connection.release();
    }
  }
}

async function scrapeAndSaveRankings(browser) {
  console.log("Scraping rankings...");
  // Puppeteer.launch() / browser.close() 제거
  const $ = await setupPage(browser, UFC_RANKINGS_URL);

  // ... (기존의 Cheerio/DB 로직은 동일) ...
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
    // DB 저장 로직 (생략하지 않고 그대로 유지)
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM rankings");
      await connection.query(
        "INSERT INTO rankings (category, `rank`, name, link, image) VALUES ?",
        [rankings]
      );
      await connection.commit();
      console.log(`✅ ${rankings.length} ranking entries saved to database.`);
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error saving rankings to DB:", error);
    } finally {
      connection.release();
    }
  }
}

async function scrapeAndSaveEvents(browser) {
  console.log("Scraping events...");
  // Puppeteer.launch() / browser.close() 제거
  const $ = await setupPage(browser, UFC_EVENTS_URL);

  // ... (기존의 Cheerio/DB 로직은 동일) ...
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
    // DB 저장 로직 (생략하지 않고 그대로 유지)
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM events");
      await connection.query(
        "INSERT INTO events (title, date, main_card_time, location, main_event, link, ticket_link) VALUES ?",
        [events]
      );
      await connection.commit();
      console.log(`✅ ${events.length} events saved to database.`);
    } catch (error) {
      await connection.rollback();
      console.error("❌ Error saving events to DB:", error);
    } finally {
      connection.release();
    }
  }
}

// --------------------------------------------------------
// 4. 메인 실행 함수 (브라우저 단일화 및 병렬 실행)
// --------------------------------------------------------
async function runAllScrapers() {
  let browser;
  try {
    console.time("Total Scraping Time");

    // 1. 브라우저 인스턴스 한 번만 실행
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // 2. 세 가지 스크래핑 작업을 Promise.all로 병렬 실행
    await Promise.all([
      scrapeAndSaveNews(browser),
      scrapeAndSaveRankings(browser),
      scrapeAndSaveEvents(browser),
    ]);

    console.timeEnd("Total Scraping Time");
    console.log("All scraping and saving tasks completed.");
  } catch (error) {
    console.error("An error occurred during the scraping process:", error);
  } finally {
    if (browser) {
      // 3. 모든 작업이 끝난 후 브라우저 한 번만 닫기
      await browser.close();
    }
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
// const puppeteer = require("puppeteer");
// const cheerio = require("cheerio");
// const pool = require("./db");

// const UFC_NEWS_URL = "https://www.ufc.com/news";
// const UFC_RANKINGS_URL = "https://www.ufc.com/rankings";
// const UFC_EVENTS_URL = "https://www.ufc.com/events";

// async function scrapeAndSaveNews() {
//   console.log("Scraping news...");
//   const browser = await puppeteer.launch({ headless: "new" });
//   const page = await browser.newPage();
//   await page.goto(UFC_NEWS_URL, { waitUntil: "networkidle2" });
//   const content = await page.content();
//   await browser.close();
//   const $ = cheerio.load(content);

//   const newsItems = [];
//   $(".c-card--grid-card-trending")
//     .slice(0, 6)
//     .each((i, el) => {
//       const title = $(el)
//         .find(".c-card--grid-card-trending__headline")
//         .text()
//         .trim();
//       const href = $(el).find("a").attr("href");
//       const link = href ? new URL(href, UFC_NEWS_URL).href : "";
//       const image = $(el).find("img").attr("src");
//       const summary = $(el).find(".c-card__summary").text().trim();
//       const date = $(el)
//         .find(".c-card--grid-card-trending__info-suffix")
//         .text()
//         .trim();
//       if (link) {
//         newsItems.push([title, summary, image, date, link]);
//       }
//     });

//   if (newsItems.length > 0) {
//     const connection = await pool.getConnection();
//     try {
//       await connection.beginTransaction();
//       await connection.query("DELETE FROM news");
//       await connection.query(
//         "INSERT INTO news (title, summary, image, date, link) VALUES ?",
//         [newsItems]
//       );
//       await connection.commit();
//       console.log(`${newsItems.length} news items saved to database.`);
//     } catch (error) {
//       await connection.rollback();
//       console.error("Error saving news to DB:", error);
//     } finally {
//       connection.release();
//     }
//   }
// }

// async function scrapeAndSaveRankings() {
//   console.log("Scraping rankings...");
//   const browser = await puppeteer.launch({ headless: "new" });
//   const page = await browser.newPage();
//   await page.goto(UFC_RANKINGS_URL, { waitUntil: "networkidle2" });
//   const content = await page.content();
//   await browser.close();
//   const $ = cheerio.load(content);

//   const rankings = [];
//   $(".view-grouping").each((i, group) => {
//     const category = $(group).find(".view-grouping-header").text().trim();
//     $(group)
//       .find("tbody tr")
//       .each((j, row) => {
//         let rank = $(row).find(".views-field-weight-class-rank").text().trim();
//         if (rank === "C") rank = "Champion";
//         const name = $(row).find(".views-field-title a").text().trim();
//         const relativeLink = $(row).find(".views-field-title a").attr("href");
//         const link = relativeLink
//           ? new URL(relativeLink, UFC_RANKINGS_URL).href
//           : "";
//         const image = $(row).find("img").attr("src") || "";
//         if (name && category) {
//           rankings.push([category, rank, name, link, image]);
//         }
//       });
//   });

//   if (rankings.length > 0) {
//     const connection = await pool.getConnection();
//     try {
//       await connection.beginTransaction();
//       await connection.query("DELETE FROM rankings");
//       await connection.query(
//         "INSERT INTO rankings (category, `rank`, name, link, image) VALUES ?",
//         [rankings]
//       );
//       await connection.commit();
//       console.log(`${rankings.length} ranking entries saved to database.`);
//     } catch (error) {
//       await connection.rollback();
//       console.error("Error saving rankings to DB:", error);
//     } finally {
//       connection.release();
//     }
//   }
// }

// async function scrapeAndSaveEvents() {
//   console.log("Scraping events...");
//   const browser = await puppeteer.launch({ headless: "new" });
//   const page = await browser.newPage();
//   await page.goto(UFC_EVENTS_URL, { waitUntil: "networkidle2" });
//   const content = await page.content();
//   await browser.close();
//   const $ = cheerio.load(content);

//   const events = [];
//   $(".c-card-event--result").each((i, el) => {
//     const href = $(el).find(".c-card-event--result__headline a").attr("href");
//     const link = href ? new URL(href, UFC_EVENTS_URL).href : "";
//     const title = $(el).find(".c-card-event--result__headline").text().trim();
//     const dateElement = $(el).find(".c-card-event--result__date");
//     const date =
//       dateElement.attr("data-prelims-card") ||
//       dateElement.attr("data-main-card") ||
//       "";
//     const mainCardTime = dateElement.attr("data-main-card") || "";
//     const location = $(el).find(".country").text().trim();
//     const ticketLinkHref = $(el).find(".e-button--white").attr("href");
//     const ticketLink = ticketLinkHref
//       ? new URL(ticketLinkHref, UFC_EVENTS_URL).href
//       : "";

//     const fighters = [];
//     $(el)
//       .find(".c-card-event--result__headline")
//       .each((i, fighterEl) => {
//         fighters.push($(fighterEl).text().trim());
//       });
//     const mainEvent =
//       fighters.length === 2 ? `${fighters[0]} vs ${fighters[1]}` : "TBD";

//     if (title && link) {
//       events.push([
//         title,
//         date,
//         mainCardTime,
//         location,
//         mainEvent,
//         link,
//         ticketLink,
//       ]);
//     }
//   });

//   if (events.length > 0) {
//     const connection = await pool.getConnection();
//     try {
//       await connection.beginTransaction();
//       await connection.query("DELETE FROM events");
//       await connection.query(
//         "INSERT INTO events (title, date, main_card_time, location, main_event, link, ticket_link) VALUES ?",
//         [events]
//       );
//       await connection.commit();
//       console.log(`${events.length} events saved to database.`);
//     } catch (error) {
//       await connection.rollback();
//       console.error("Error saving events to DB:", error);
//     } finally {
//       connection.release();
//     }
//   }
// }

// async function runAllScrapers() {
//   try {
//     await scrapeAndSaveNews();
//     await scrapeAndSaveRankings();
//     await scrapeAndSaveEvents();
//     console.log("All scraping and saving tasks completed.");
//   } catch (error) {
//     console.error("An error occurred during the scraping process:", error);
//   } finally {
//     await pool.end();
//     console.log("MySQL pool closed.");
//   }
// }

// if (require.main === module) {
//   runAllScrapers();
// }

// module.exports = {
//   scrapeAndSaveNews,
//   scrapeAndSaveRankings,
//   scrapeAndSaveEvents,
//   runAllScrapers,
// };
