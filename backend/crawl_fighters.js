const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const RANKINGS_PATH = path.join(__dirname, "..", "rankings.json");
const OUTPUT_PATH = path.join(__dirname, "..", "fighters_details.json");

const scrapeFighterPage = async (browser, fighterUrl) => {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36"
    );
    await page.goto(fighterUrl, { waitUntil: "networkidle2" });
    const content = await page.content();
    const $ = cheerio.load(content);

    const profile = {};
    
    profile.name = $("h1.hero-profile__name").text().trim();
    profile.nickname = $(".hero-profile__nickname").text().trim();
    
    // --- NEW IMAGE LOGIC ---
    // Try to get headshot from the first fight history card (look for the one with a win/loss plaque)
    let headshot = $('.c-card-event--athlete-results__image.win img, .c-card-event--athlete-results__image.loss img').first().attr('src');
    // Final fallback to the main hero image
    profile.image = headshot || $(".hero-profile__image").attr("src"); 

    profile.record = $(".hero-profile__division-body").text().trim();
    profile.weightClass = $(".hero-profile__division-title").text().trim();

    const stats = {};
    // Scrape simple stats from the top hero section
    $(".hero-profile__stat").each((i, el) => {
      const value = $(el).find(".hero-profile__stat-numb").text().trim();
      const label = $(el).find(".hero-profile__stat-text").text().trim();
      if (label && value) {
        stats[label] = value;
      }
    });
    
    // Scrape more detailed stats from the comparison groups
    $(".c-stat-compare__group").each((i, el) => {
        const value = $(el).find('.c-stat-compare__number').text().trim().replace(/\n/g, '');
        const label = $(el).find('.c-stat-compare__label').text().trim();
        if (label && value && !stats[label]) { // Avoid overwriting simple stats if labels are the same
            stats[label] = value;
        }
    });
    profile.stats = stats;

    const fightHistory = [];
    $("article.c-card-event--athlete-results").each((i, el) => {
      const opponent = $(el).find("h3.c-card-event--athlete-results__headline a").last().text().trim();
      const date = $(el).find(".c-card-event--athlete-results__date").text().trim();
      const resultText = $(el).find(".c-card-event--athlete-results__plaque").first().text().trim();
      
      const results = {};
      $(el).find('.c-card-event--athlete-results__result').each((i, resEl) => {
          const label = $(resEl).find('.c-card-event--athlete-results__result-label').text().trim();
          const value = $(resEl).find('.c-card-event--athlete-results__result-text').text().trim();
          results[label] = value;
      });

      fightHistory.push({
        event: 'N/A', // Event name is too difficult to reliably scrape from this structure
        date: date,
        opponent: opponent,
        result: resultText || 'N/A',
        method: results['메소드'] || 'N/A',
        round: results['일주'] || 'N/A',
        time: results['시간'] || 'N/A',
      });
    });
    profile.fightHistory = fightHistory;

    return profile;
  } finally {
    await page.close();
  }
};

const crawlAllFighters = async () => {
  console.log("Starting fighter details crawl...");
  const rankingsData = JSON.parse(fs.readFileSync(RANKINGS_PATH, "utf8"));
  const allFighters = {};
  
  const fighterMap = new Map();
  rankingsData.forEach(category => {
    category.fighters.forEach(fighter => {
      if (fighter.link && !fighterMap.has(fighter.link)) {
        fighterMap.set(fighter.link, fighter);
      }
    });
  });

  const browser = await puppeteer.launch({ headless: "new" });
  const urlArray = Array.from(fighterMap.values());

  console.log(`Found ${urlArray.length} unique fighters to crawl.`);

  for (let i = 0; i < urlArray.length; i++) {
    const fighter = urlArray[i];
    const url = fighter.link;
    const fighterSlug = url.split('/').pop();

    console.log(`Crawling ${i + 1}/${urlArray.length}: ${fighterSlug}`);
    try {
      // Note: We are no longer passing the headshot from rankings, but scraping it from the detail page itself.
      const details = await scrapeFighterPage(browser, url);
      if (details && details.name) { // Basic validation
        allFighters[fighterSlug] = details;
      } else {
        console.log(`-- WARN: Could not scrape details for ${fighterSlug}`);
      }
    } catch (error) {
      console.error(`-- ERROR crawling ${fighterSlug}:`, error.message);
    }
    // Add a small delay to avoid getting blocked
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  await browser.close();

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allFighters, null, 2));
  console.log(`Successfully crawled and saved fighter details to ${OUTPUT_PATH}`);
};

crawlAllFighters();
