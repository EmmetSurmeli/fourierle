import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1280,height:1100},deviceScaleFactor:1});
mkdirSync('../work/review',{recursive:true});
await page.goto('http://127.0.0.1:5173');await page.getByRole('combobox').waitFor();await page.waitForTimeout(500);await page.screenshot({path:'../work/review/desktop.png',fullPage:true});
await page.setViewportSize({width:375,height:900});await page.screenshot({path:'../work/review/mobile.png',fullPage:true});
await page.setViewportSize({width:1280,height:1100});await page.goto('http://127.0.0.1:5173/?lab');await page.locator('select').waitFor();
for(const id of ['ITA','CHL','USA','GBR','JPN','IDN','FJI','NZL','NOR','CAN','RUS','FRA','TUR','GRC','AUS','BRA','ZAF','IND','MDG','NLD']){await page.locator('select').selectOption(id);await page.waitForTimeout(200);await page.locator('.lab-grid').screenshot({path:`../work/review/${id}.png`});}
await browser.close();
