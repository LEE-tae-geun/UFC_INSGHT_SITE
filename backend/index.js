const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const path = require("path");
const fs = require("fs");
// const { crawlFighterDetails } = require("./crawl_fighter_details"); // 외부 모듈을 가정합니다.

const app = express();
const port = process.env.PORT || 5000;

// =======================================================
// 1. 전역 변수 설정 (브라우저 인스턴스 및 캐시)
// =======================================================
let globalBrowser = null;
const globalCache = {
  news: [],
  events: [],
  lastUpdated: null,
};

// =======================================================
// 2. Puppeteer 헬퍼 함수 (재사용 가능한 페이지 및 최적화)
// =======================================================

// 불필요한 리소스 차단 및 페이지 설정
async function setupOptimizedPage(browser, url) {
  const page = await browser.newPage();

  // 리소스 차단: 이미지, CSS, 폰트 로드 방지
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const resourceType = req.resourceType();
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

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
  );
  // DOM 구조가 로드되면 즉시 진행 (networkidle2 대신)
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  const content = await page.content();
  await page.close(); // 페이지 닫고 자원 해제
  return cheerio.load(content);
}

// -------------------------------------------------------
// 3. 캐시 업데이트 함수 (백그라운드 작업)
// -------------------------------------------------------

const UFC_NEWS_URL = "https://www.ufc.com/news";
const UFC_EVENTS_URL = "https://www.ufc.com/events";
const UPDATE_INTERVAL = 1000 * 60 * 30; // 30분마다 업데이트

async function updateNewsCache() {
  if (!globalBrowser) {
    console.error("Browser not launched for news update.");
    return;
  }
  console.log("-> Starting News cache update...");
  try {
    const $ = await setupOptimizedPage(globalBrowser, UFC_NEWS_URL);

    const news = $(".c-card--grid-card-trending")
      .slice(0, 6)
      .map((i, el) => {
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
        return { title, summary, image, date, link };
      })
      .get();

    globalCache.news = news;
    globalCache.lastUpdated = new Date().toISOString();
    console.log(
      `-> News cache updated successfully at ${globalCache.lastUpdated}.`
    );
  } catch (error) {
    console.error("-> Error updating news cache:", error);
  }
}

async function updateEventsCache() {
  if (!globalBrowser) {
    console.error("Browser not launched for events update.");
    return;
  }
  console.log("-> Starting Events cache update...");
  try {
    const $ = await setupOptimizedPage(globalBrowser, UFC_EVENTS_URL);
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

      if (title) {
        events.push({
          title,
          date,
          mainCardTime,
          location,
          mainEvent,
          link,
          ticketLink,
        });
      }
    });

    globalCache.events = events;
    globalCache.lastUpdated = new Date().toISOString();
    console.log(
      `-> Events cache updated successfully at ${globalCache.lastUpdated}.`
    );
  } catch (error) {
    console.error("-> Error updating events cache:", error);
  }
}

// -------------------------------------------------------
// 4. 서버 초기화 및 브라우저 실행
// -------------------------------------------------------

async function initServer() {
  try {
    console.log("1. Launching global Puppeteer browser instance...");
    // 브라우저를 한 번만 띄웁니다.
    globalBrowser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });

    console.log("2. Performing initial cache update...");
    await Promise.all([updateNewsCache(), updateEventsCache()]);

    console.log(
      `3. Setting up cache update interval (${
        UPDATE_INTERVAL / 1000
      } seconds)...`
    );
    setInterval(async () => {
      await Promise.all([updateNewsCache(), updateEventsCache()]);
    }, UPDATE_INTERVAL);

    // Express 서버 시작
    if (require.main === module) {
      app.listen(port, () => {
        console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
      });
    }
  } catch (error) {
    console.error("FATAL: Failed to initialize server or browser:", error);
    // 서버 시작 실패 시 프로세스 종료
    if (globalBrowser) await globalBrowser.close();
    process.exit(1);
  }
}

// =======================================================
// 5. Express 미들웨어 및 라우팅 설정
// =======================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Namuwiki _files 디렉토리를 정적으로 제공 (기존 코드 유지)
app.use(
  "/namuwiki_files",
  express.static(
    path.join(
      __dirname,
      "..",
      "ufc 선수 데이터",
      "틀_역대 UFC 한국인 파이터 - 나무위키_files"
    )
  )
);

// [최적화 완료] UFC 뉴스 API 엔드포인트 (캐시 사용)
app.get("/api/news", (req, res) => {
  // 실시간 스크래핑 대신 캐시된 데이터를 즉시 반환
  res.json(globalCache.news);
});

// UFC 랭킹 API 엔드포인트 (JSON 파일 사용 - 이미 빠름)
app.get("/api/rankings", (req, res) => {
  try {
    const rankingsPath = path.join(__dirname, "..", "rankings.json");
    const rankingsData = fs.readFileSync(rankingsPath, "utf8");
    res.json(JSON.parse(rankingsData));
  } catch (error) {
    console.error("Error reading rankings.json file:", error);
    res.status(500).json({ error: "랭킹 정보를 가져오는 데 실패했습니다." });
  }
});

// [최적화 완료] UFC 경기 일정 API 엔드포인트 (캐시 사용)
app.get("/api/events", (req, res) => {
  // 실시간 스크래핑 대신 캐시된 데이터를 즉시 반환
  res.json(globalCache.events);
});

// [주의] UFC 선수 상세 정보 API 엔드포인트 (실시간 스크래핑)
// 이 함수(crawlFighterDetails)는 외부 파일에 있으므로 수정하기 어렵지만,
// 브라우저 인스턴스를 인수로 받도록 수정하거나,
// 해당 정보를 미리 모두 스크래핑하여 JSON 파일로 저장해 두고 제공하는 것이
// 사용자 경험에 훨씬 좋습니다. 현재는 기존 방식을 유지합니다.
// crawlFighterDetails 함수가 브라우저를 재사용하도록 최적화되어 있어야 합니다.

// 임시: 외부 함수를 직접 호출하는 방식 유지 (속도 느림)
app.get("/api/fighter/:name", async (req, res) => {
  // WARNING: 이 엔드포인트는 여전히 외부 함수에서 브라우저를 launch/close 한다면 느립니다.
  // 외부 모듈(`crawlFighterDetails`)을 브라우저 재사용 로직으로 수정해야 합니다.
  const { crawlFighterDetails } = require("./crawl_fighter_details"); // 매 요청마다 require는 비효율적이지만, 편의상 유지
  try {
    const fighterSlug = req.params.name;
    // crawlFighterDetails 함수가 globalBrowser를 사용하도록 수정하는 것이 이상적입니다.
    const fighterData = await crawlFighterDetails(fighterSlug);

    if (fighterData && fighterData.name) {
      res.json(fighterData);
    } else {
      res
        .status(404)
        .json({ error: "Fighter not found or failed to crawl details." });
    }
  } catch (error) {
    console.error("Error in /api/fighter/:name endpoint:", error);
    res.status(500).json({ error: "선수 정보를 불러오는 데 실패했습니다." });
  }
});

// UFC 한국인 파이터 API 엔드포인트 (로컬 파일 사용 - 이미 빠름)
app.get("/api/korean-fighters", (req, res) => {
  const koreanFightersPath = path.join(__dirname, "korean_fighters.json");
  fs.readFile(koreanFightersPath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading korean_fighters.json file:", err);
      return res
        .status(500)
        .json({ error: "한국인 파이터 데이터를 불러오는 데 실패했습니다." });
    }
    try {
      res.json(JSON.parse(data));
    } catch (parseError) {
      console.error("Error parsing korean_fighters.json:", parseError);
      res
        .status(500)
        .json({ error: "한국인 파이터 데이터 형식에 오류가 있습니다." });
    }
  });
});

// ########### 배포를 위한 설정 ###########
app.use(express.static(path.join(__dirname, "../frontend/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});
// ######################################

// 서버 초기화 시작
if (require.main === module) {
  initServer();
}

module.exports = app;
// const express = require("express");
// const cors = require("cors");
// const puppeteer = require("puppeteer");
// const cheerio = require("cheerio");

// const path = require("path"); // path 모듈 추가
// const fs = require("fs"); // fs 모듈 추가
// const app = express();
// const port = 5000; // 프론트엔드 프록시 설정과 일치시킵니다.

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Namuwiki _files 디렉토리를 정적으로 제공
// app.use(
//   "/namuwiki_files",
//   express.static(
//     path.join(
//       __dirname,
//       "..",
//       "ufc 선수 데이터",
//       "틀_역대 UFC 한국인 파이터 - 나무위키_files"
//     )
//   )
// );

// // UFC 뉴스 API 엔드포인트 (실시간 스크래핑)
// app.get("/api/news", async (req, res) => {
//   try {
//     const UFC_NEWS_URL = "https://www.ufc.com/news";
//     const browser = await puppeteer.launch({
//       headless: "new",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });
//     const page = await browser.newPage();
//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
//     );
//     await page.goto(UFC_NEWS_URL, { waitUntil: "networkidle2" });
//     const content = await page.content();
//     await browser.close();
//     const $ = cheerio.load(content);

//     const news = $(".c-card--grid-card-trending")
//       .slice(0, 6)
//       .map((i, el) => {
//         const title = $(el)
//           .find(".c-card--grid-card-trending__headline")
//           .text()
//           .trim();
//         const href = $(el).find("a").attr("href");
//         const link = href ? new URL(href, UFC_NEWS_URL).href : "";
//         const image = $(el).find("img").attr("src");
//         const summary = $(el).find(".c-card__summary").text().trim();
//         const date = $(el)
//           .find(".c-card--grid-card-trending__info-suffix")
//           .text()
//           .trim();
//         return { title, summary, image, date, link };
//       })
//       .get();

//     res.json(news);
//   } catch (error) {
//     if (process.env.NODE_ENV !== "test") {
//       console.error("Error scraping news:", error);
//     }
//     res.status(500).json({ error: "뉴스를 가져오는 데 실패했습니다." });
//   }
// });

// // UFC 랭킹 API 엔드포인트 (JSON 파일 사용)
// app.get("/api/rankings", (req, res) => {
//   try {
//     const rankingsPath = path.join(__dirname, "..", "rankings.json");
//     const rankingsData = fs.readFileSync(rankingsPath, "utf8");
//     res.json(JSON.parse(rankingsData));
//   } catch (error) {
//     if (process.env.NODE_ENV !== "test") {
//       console.error("Error reading rankings.json file:", error);
//     }
//     res.status(500).json({ error: "랭킹 정보를 가져오는 데 실패했습니다." });
//   }
// });

// // UFC 경기 일정 API 엔드포인트 (실시간 스크래핑)
// app.get("/api/events", async (req, res) => {
//   try {
//     const UFC_EVENTS_URL = "https://www.ufc.com/events";
//     const browser = await puppeteer.launch({
//       headless: "new",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });
//     const page = await browser.newPage();
//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
//     );
//     await page.goto(UFC_EVENTS_URL, { waitUntil: "networkidle2" });
//     const content = await page.content();
//     await browser.close();
//     const $ = cheerio.load(content);
//     const events = [];

//     $(".c-card-event--result").each((i, el) => {
//       const href = $(el).find(".c-card-event--result__headline a").attr("href");
//       const link = href ? new URL(href, UFC_EVENTS_URL).href : "";
//       const title = $(el).find(".c-card-event--result__headline").text().trim();
//       const dateElement = $(el).find(".c-card-event--result__date");
//       const date =
//         dateElement.attr("data-prelims-card") ||
//         dateElement.attr("data-main-card") ||
//         "";
//       const mainCardTime = dateElement.attr("data-main-card") || "";
//       const location = $(el).find(".country").text().trim();
//       const ticketLinkHref = $(el).find(".e-button--white").attr("href");
//       const ticketLink = ticketLinkHref
//         ? new URL(ticketLinkHref, UFC_EVENTS_URL).href
//         : "";

//       const fighters = [];
//       $(el)
//         .find(".c-card-event--result__headline")
//         .each((i, fighterEl) => {
//           fighters.push($(fighterEl).text().trim());
//         });

//       const mainEvent =
//         fighters.length === 2 ? `${fighters[0]} vs ${fighters[1]}` : "TBD";

//       if (title) {
//         events.push({
//           title,
//           date,
//           mainCardTime,
//           location,
//           mainEvent,
//           link,
//           ticketLink,
//         });
//       }
//     });

//     res.json(events);
//   } catch (error) {
//     if (process.env.NODE_ENV !== "test") {
//       console.error("Error scraping events:", error);
//     }
//     res.status(500).json({ error: "경기 일정을 가져오는 데 실패했습니다." });
//   }
// });

// // UFC 선수 상세 정보 API 엔드포인트 (JSON 파일 사용)
// const { crawlFighterDetails } = require("./crawl_fighter_details");

// app.get("/api/fighter/:name", async (req, res) => {
//   try {
//     const fighterSlug = req.params.name;
//     const fighterData = await crawlFighterDetails(fighterSlug);

//     if (fighterData && fighterData.name) {
//       res.json(fighterData);
//     } else {
//       res
//         .status(404)
//         .json({ error: "Fighter not found or failed to crawl details." });
//     }
//   } catch (error) {
//     if (process.env.NODE_ENV !== "test") {
//       console.error("Error in /api/fighter/:name endpoint:", error);
//     }
//     res.status(500).json({ error: "선수 정보를 불러오는 데 실패했습니다." });
//   }
// });

// // UFC 한국인 파이터 API 엔드포인트 (로컬 파일 사용)
// app.get("/api/korean-fighters", async (req, res) => {
//   const koreanFightersPath = path.join(__dirname, "korean_fighters.json");
//   fs.readFile(koreanFightersPath, "utf8", (err, data) => {
//     if (err) {
//       console.error("Error reading korean_fighters.json file:", err);
//       return res
//         .status(500)
//         .json({ error: "한국인 파이터 데이터를 불러오는 데 실패했습니다." });
//     }
//     try {
//       res.json(JSON.parse(data));
//     } catch (parseError) {
//       console.error("Error parsing korean_fighters.json:", parseError);
//       res
//         .status(500)
//         .json({ error: "한국인 파이터 데이터 형식에 오류가 있습니다." });
//     }
//   });
// });

// // ########### 배포를 위한 설정 ###########
// // React 앱의 빌드된 정적 파일들을 제공합니다.
// app.use(express.static(path.join(__dirname, "../frontend/build")));

// // 모든 경로에 대한 요청을 React 앱으로 전달하여 클라이언트 사이드 라우팅이 동작하게 합니다.
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
// });
// // ######################################

// // `node index.js`로 직접 실행될 때만 서버를 시작합니다.
// // 테스트 환경에서는 서버가 자동으로 시작되지 않습니다.
// if (require.main === module) {
//   app.listen(port, () => {
//     console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
//   });
// }

// module.exports = app; // 테스트를 위해 app을 export 합니다.
