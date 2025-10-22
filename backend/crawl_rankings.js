const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const UFC_RANKINGS_URL = "https://www.ufc.com/rankings";
const UFC_BASE_URL = "https://www.ufc.com";

const crawl = async () => {
  console.log("Starting UFC rankings crawl...");
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
    );
    await page.goto(UFC_RANKINGS_URL, { waitUntil: "networkidle2" });
    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content);
    const rankings = [];

    $(".view-grouping").each((i, group) => {
      const category = $(group).find(".view-grouping-header").text().trim();
      const fighters = [];

      // Champion
      const championInfo = $(group).find(".rankings--athlete--champion");
      if (championInfo.length) {
        const championName = championInfo.find("h5 a").text().trim();
        const relativeLink = championInfo.find("h5 a").attr("href");
        const championLink = relativeLink ? new URL(relativeLink, UFC_BASE_URL).href : "";
        const championImage = championInfo.find("img").attr("src");

        if (championName) {
          fighters.push({
            rank: "Champion",
            name: championName,
            link: championLink,
            image: championImage,
          });
        }
      }

      // Rankers
      $(group).find("tbody tr").each((j, row) => {
          const rank = $(row).find(".views-field-weight-class-rank").text().trim();
          const name = $(row).find(".views-field-title a").text().trim();
          const relativeLink = $(row).find(".views-field-title a").attr("href");
          const link = relativeLink ? new URL(relativeLink, UFC_BASE_URL).href : "";
          // Attempt to find the fighter's image within the row.
          const image = $(row).find("img").attr("src");

          if (name) {
            fighters.push({ rank: rank || "N/A", name, link, image: image || "" });
          }
        });

      if (category && fighters.length > 0) {
        let finalFighters = fighters;
        // If it's a P4P list, remove the "Champion" entry which is a duplicate.
        if (category.includes("Pound-for-Pound")) {
          finalFighters = fighters.filter(fighter => fighter.rank !== "Champion");
        }
        rankings.push({ category, fighters: finalFighters });
      }
    });

    const outputPath = path.join(__dirname, "..", "rankings.json");
    fs.writeFileSync(outputPath, JSON.stringify(rankings, null, 2));
    console.log(`Successfully crawled and saved rankings to ${outputPath}`);

  } catch (error) {
    console.error("Error during crawling:", error);
  }
};

crawl();
