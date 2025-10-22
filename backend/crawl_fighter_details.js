const puppeteer = require("puppeteer");

async function crawlFighterDetails(fighterName) {
  const url = `https://www.ufc.com/athlete/${encodeURIComponent(fighterName)}`;
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "networkidle2" });

    const fighterData = await page.evaluate(() => {
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

    return fighterData;
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { crawlFighterDetails };
