const puppeteer = require("puppeteer");

/**
 *
 * 브라우저 인스턴스 재사용 및 환경설정 함수
 *
 */
async function setupBrowser() {
  return puppeteer.launch({
    //new는 headless: true와 동일하지만 새로운 API 표준
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      //메모리 사용량을 줄이기 위한 추가 옵션
      "--disable-gpu",
      "single-process",
      "--disable-dev-shm-usage",
    ],
  });
}

/**
 * 단일 파이터 스크래핑 함수 (페이지 인스턴스를 받음)
 */

// --------------------------------------------------------
// 1. 브라우저 인스턴스 재사용 및 환경 설정 함수
// --------------------------------------------------------
async function setupBrowser() {
  return puppeteer.launch({
    // 'new'는 headless: true와 동일하지만 새로운 API 표준
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // 메모리 사용량을 줄이기 위한 추가 옵션
      "--disable-gpu",
      "--single-process",
      "--disable-dev-shm-usage",
    ],
  });
}

// --------------------------------------------------------
// 2. 단일 파이터 스크래핑 함수 (페이지 인스턴스를 받음)
// --------------------------------------------------------
async function crawlSingleFighter(browser, fighterName) {
  const url = `https://www.ufc.com/athlete/${encodeURIComponent(fighterName)}`;
  let page;
  try {
    page = await browser.newPage();

    // 2-1. 🚧 불필요한 리소스 차단 (핵심 속도 개선 포인트)
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      // 이미지, CSS, 폰트 파일 로드를 차단합니다.
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

    // 뷰포트를 설정하여 렌더링 부하를 줄입니다.
    await page.setViewport({ width: 1000, height: 800 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
    );

    // 2-2. ⏱ waitUntil 옵션 변경 (networkidle2 -> domcontentloaded)
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // 데이터 추출 로직은 동일하게 유지
    const fighterData = await page.evaluate(() => {
      // ... (기존의 page.evaluate() 내부 코드)
      const name =
        document.querySelector(".hero-profile__name")?.textContent.trim() || "";
      const nickname =
        document.querySelector(".hero-profile__nickname")?.textContent.trim() ||
        "";
      const image = document.querySelector(".hero-profile__image")?.src || "";
      const record =
        document
          .querySelector(".hero-profile__division-body")
          ?.textContent.trim() || "";
      const weightClass =
        document
          .querySelector(".hero-profile__division-title")
          ?.textContent.trim() || "";

      const stats = {};
      document.querySelectorAll(".c-bio__field").forEach((el) => {
        const label = el.querySelector(".c-bio__label")?.textContent.trim();
        const value = el.querySelector(".c-bio__text")?.textContent.trim();
        if (label && value) {
          stats[label] = value;
        }
      });

      const fightHistory = [];
      document
        .querySelectorAll(".c-card-event--athlete-results")
        .forEach((el) => {
          const opponent =
            el
              .querySelector(
                ".c-card-event--athlete-results__headline a:last-child"
              )
              ?.textContent.trim() || "";
          const result =
            el
              .querySelector(".c-card-event--athlete-results__plaque")
              ?.textContent.trim() || "";
          const date =
            el
              .querySelector(".c-card-event--athlete-results__date")
              ?.textContent.trim() || "";

          fightHistory.push({ opponent, result, date });
        });

      return {
        name,
        nickname,
        image,
        record,
        weightClass,
        stats,
        fightHistory,
      };
    });

    console.log(`✅ Success crawling ${fighterName}`);
    return fighterData;
  } catch (error) {
    console.error(`❌ Error crawling ${fighterName} (${url}):`, error.message);
    return { name: fighterName, error: error.message };
  } finally {
    // 페이지 닫기 (브라우저는 닫지 않음)
    if (page) {
      await page.close();
    }
  }
}

// --------------------------------------------------------
// 3. 메인 병렬 처리 함수 (브라우저를 한 번만 띄움)
// --------------------------------------------------------
async function crawlFightersParallel(fighterNames, maxConcurrency = 5) {
  const browser = await setupBrowser(); // 1. 브라우저 한 번만 띄우기

  try {
    const fighterPromises = fighterNames.map((name) =>
      // Promise.all 대신 p-limit 같은 라이브러리를 사용하여
      // 동시성(Concurrency)을 제어할 수도 있지만, 간단하게 map으로 구현
      // 이 예시에서는 동시성 제한을 직접 구현하지 않았습니다.
      // (Render 환경에서 메모리 오류를 피하기 위해 실제로는 제한하는 것이 좋습니다.)
      crawlSingleFighter(browser, name)
    );

    // 3. Promise.all로 모든 스크래핑 작업을 병렬로 실행
    const results = await Promise.all(fighterPromises);
    return results;
  } catch (error) {
    console.error("Critical error in parallel processing:", error);
    return [];
  } finally {
    // 모든 작업이 끝난 후 브라우저 닫기
    await browser.close();
  }
}

module.exports = { crawlSingleFighter, crawlFightersParallel };

// 사용 예시 (별도 파일에서 실행)
/*
const { crawlFightersParallel } = require('./crawler');

async function main() {
    const fighters = ['Conor McGregor', 'Khabib Nurmagomedov', 'Jon Jones', 'Israel Adesanya'];
    console.time("Total Scraping Time");
    
    // maxConcurrency를 설정하여 Render.com의 자원 한계를 초과하지 않도록 할 수 있습니다.
    const data = await crawlFightersParallel(fighters, 5); 
    
    console.timeEnd("Total Scraping Time");
    console.log("--- Results ---");
    console.log(data);
}

main();
*/
// async function crawlFighterDetails(fighterName) {
//   const url = `https://www.ufc.com/athlete/${encodeURIComponent(fighterName)}`;
//   let browser;
//   try {
//     browser = await puppeteer.launch({
//       headless: "new",
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });
//     const page = await browser.newPage();
//     await page.setUserAgent(
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
//     );
//     await page.goto(url, { waitUntil: "networkidle2" });

//     const fighterData = await page.evaluate(() => {
//       const name =
//         document.querySelector(".hero-profile__name")?.textContent.trim() || "";
//       const nickname =
//         document.querySelector(".hero-profile__nickname")?.textContent.trim() ||
//         "";
//       const image = document.querySelector(".hero-profile__image")?.src || "";
//       const record =
//         document
//           .querySelector(".hero-profile__division-body")
//           ?.textContent.trim() || "";
//       const weightClass =
//         document
//           .querySelector(".hero-profile__division-title")
//           ?.textContent.trim() || "";

//       const stats = {};
//       document.querySelectorAll(".c-bio__field").forEach((el) => {
//         const label = el.querySelector(".c-bio__label")?.textContent.trim();
//         const value = el.querySelector(".c-bio__text")?.textContent.trim();
//         if (label && value) {
//           stats[label] = value;
//         }
//       });

//       const fightHistory = [];
//       document
//         .querySelectorAll(".c-card-event--athlete-results")
//         .forEach((el) => {
//           const opponent =
//             el
//               .querySelector(
//                 ".c-card-event--athlete-results__headline a:last-child"
//               )
//               ?.textContent.trim() || "";
//           const result =
//             el
//               .querySelector(".c-card-event--athlete-results__plaque")
//               ?.textContent.trim() || "";
//           const date =
//             el
//               .querySelector(".c-card-event--athlete-results__date")
//               ?.textContent.trim() || "";

//           fightHistory.push({ opponent, result, date });
//         });

//       return {
//         name,
//         nickname,
//         image,
//         record,
//         weightClass,
//         stats,
//         fightHistory,
//       };
//     });

//     return fighterData;
//   } catch (error) {
//     console.error(`Error crawling ${url}:`, error);
//     return null;
//   } finally {
//     if (browser) {
//       await browser.close();
//     }
//   }
// }

// module.exports = { crawlFighterDetails };
