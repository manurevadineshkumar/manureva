const puppeteer = require('puppeteer');

async function scrape_list() {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on("request", req => {
        if (req.resourceType() === "document" || req.resourceType() === "script" || req.resourceType() === "xhr") {
            return req.continue();
        }

        return req.abort();
    });

    // Navigate the page to a URL
    await page.goto('https://www.opulencevintage.com/stock');

    // Set screen size
    await page.setViewport({width: 1080, height: 1024});

    let currentPage = await page.$eval('span#count', el => el.innerText);
    console.log(currentPage);

    const pageHandle = await page.$('span#count');
    const totalPageHandle = await pageHandle.evaluateHandle(el => el.nextElementSibling);
    // const totalPage = await totalPageHandle.evaluate(el => el.innerText.replace(/[^0-9]/g, ""));
    const totalPage = "1";
    console.log(totalPage);
    while (currentPage !== totalPage) {
        currentPage = await page.$eval('span#count', el => el.innerText);
        console.log(currentPage);

        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await new Promise(r => setTimeout(r, 1000));
    }

    const links = await page.$$eval("div.artist > a.artist", (el) => {return el.map((a) => a.href)});
    console.log(links);

    // Type into search box
    // await page.type('.devsite-search-field', 'automate beyond recorder');

    // // Wait and click on first result
    // const searchResultSelector = '.devsite-result-item-link';
    // await page.waitForSelector(searchResultSelector);
    // await page.click(searchResultSelector);

    // // Locate the full title with a unique string
    // const textSelector = await page.waitForSelector(
    //   'text/Customize and automate'
    // );
    // const fullTitle = await textSelector?.evaluate(el => el.textContent);

    // // Print the full title
    // console.log('The title of this blog post is "%s".', fullTitle);

    await browser.close();
}


async function scrape_item(url) {
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    
    await page.setRequestInterception(true);

    page.on("request", req => {
        if (req.resourceType() === "document" || req.resourceType() === "script" || req.resourceType() === "xhr") {
            return req.continue();
        }

        return req.abort();
    });

    // Navigate the page to a URL
    await page.goto(url);
    // await page.goto('https://www.opulencevintage.com/clothing/dior-3/christian-dior-beige-suit-jacket'); // Without discount
    // await page.goto('https://www.opulencevintage.com/clothing/jackets/gucci-black-wool-jacket'); // With discount

    const divs = await page.$$eval("div#product_banner div", (el) => {
        return el.map(e => e.innerText);
    });
    // console.log(
    //     divs
    //         .filter(e => !e.includes ("France"))
    //         .join("")
    //         .split("\n")
    //         .map(e => e.trim())
    //         .filter(e => !e.includes("Shipping") && !e.includes("Enquire") && !e.includes("Add to Cart"))
    //         .filter(Boolean)
    // );

    const description = await page.$eval("div#product_banner > div:not(.row) > p:not(.row)", el => el.innerText);
    // console.log(`Description: ${description}`);

    const prices2 = await page.$eval("div#price_format", el => el.innerText);
    // console.log({price2: prices2.split("SALE")});
    // console.log({
    //     price: +prices2.split("SALE")[0].replace("€", "").trim(),
    //     price_discounted: +prices2.split("SALE")[1]?.replace("€", "").trim() ?? null
    // });

    const imageUrls = await page.$$eval("a[data-fancybox='gallery']", (el) => {
        return el.map(e => e.href);
    });
    console.log(imageUrls.filter(url => url.endsWith(".jpg") || url.endsWith(".png") || url.endsWith(".jpeg")));

    const dimensions = await page.$$eval("div#collapseDimensions span", (elements) => {
        return elements.map(e => e.innerText);
    });
    // console.log(dimensions);

    const sizeDimensionsEntries = dimensions.reduce((acc, val, index, array) => {
        if (index % 2 === 0) {
            acc.push(
                array.slice(index, index + 2).map(e => e.trim())
            );
        }
        return acc;
    }, []);
    console.log(Object.fromEntries(sizeDimensionsEntries));

    await browser.close();
}

// scrape_item("https://www.opulencevintage.com/clothing/dior-3/christian-dior-beige-suit-jacket");
// scrape_item("https://www.opulencevintage.com/clothing/jackets/gucci-black-wool-jacket");
// scrape_item("https://www.opulencevintage.com/handbags/christian-dior-wool-bag-brown-leather-and-monogram-fabrics");

scrape_item("https://www.opulencevintage.com/handbags/louis-vuitton/2007-louis-vuitton-lockit-epi-leather");
