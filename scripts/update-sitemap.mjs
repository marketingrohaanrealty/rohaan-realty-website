#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const siteHost = "https://rohaanrealty.com";
const ignored = new Set(["404.html", "success.html", "thank-you.html", "thankyou.html"]);
const rootHtml = fs.readdirSync(".")
  .filter(name => name.endsWith(".html") && !ignored.has(name) && fs.statSync(name).isFile())
  .sort((a,b) => a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b));

const entries = [];
for (const file of rootHtml) {
  const html = fs.readFileSync(file, "utf8");
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  if (!canonical || !canonical.startsWith(siteHost + "/")) continue;
  if (/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)) continue;
  if (/\/(success|thank-?you)(\.html)?\/?$/i.test(new URL(canonical).pathname)) continue;
  const lastmod = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { encoding: "utf8" }).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) throw new Error("Could not determine last modified date for " + file);
  entries.push({ url: canonical.replace(/&/g, "&amp;"), lastmod });
}
if (!entries.some(entry => entry.url === siteHost + "/")) throw new Error("Homepage canonical URL is missing; sitemap was not written.");
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(entry => `  <url><loc>${entry.url}</loc><lastmod>${entry.lastmod}</lastmod></url>`),
  '</urlset>',
  ''
].join("\n");
fs.writeFileSync("sitemap.xml", xml, "utf8");
console.log("Updated sitemap.xml with " + entries.length + " canonical pages.");
