import fs from 'node:fs';
import crypto from 'node:crypto';
import { services } from './service-pages.mjs';

const root = 'dist';
const sitemap = fs.readFileSync(`${root}/sitemap.xml`, 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
if (sitemapUrls.length !== 3 + services.length) throw new Error(`Expected ${3 + services.length} indexable URLs, found ${sitemapUrls.length}.`);
if (sitemap.includes('/owner.html') || sitemap.includes('/api/')) throw new Error('Private owner/API route found in sitemap.');
if (!sitemapUrls.includes('https://the-hok-me.vercel.app/')) throw new Error('Sitemap does not use the configured production origin.');
const titles = new Set();
for (const service of services) {
  const file = `${root}/services/${service.slug}/index.html`;
  const html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const h1 = html.match(/<h1>([^<]+)<\/h1>/)?.[1];
  const jsonLd = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
  if (!title || !description || !h1 || !jsonLd) throw new Error(`${service.slug} is missing metadata, a heading, or structured data.`);
  if (titles.has(title)) throw new Error(`Duplicate service title: ${title}`);
  titles.add(title);
  if (canonical !== `https://the-hok-me.vercel.app/services/${service.slug}`) throw new Error(`Incorrect canonical on ${service.slug}.`);
  if (!sitemapUrls.includes(canonical)) throw new Error(`${service.slug} is not included in sitemap.`);
  if (JSON.parse(jsonLd)['@type'] !== 'Service') throw new Error(`Invalid Service JSON-LD on ${service.slug}.`);
}
const original = fs.readFileSync('google0a9687274ca52e4f.html');
const deployedAsset = fs.readFileSync(`${root}/google0a9687274ca52e4f.html`);
if (crypto.createHash('sha256').update(original).digest('hex') !== crypto.createHash('sha256').update(deployedAsset).digest('hex')) throw new Error('Google verification file was altered in the build.');
const robots = fs.readFileSync(`${root}/robots.txt`, 'utf8');
if (!robots.includes('Sitemap: https://the-hok-me.vercel.app/sitemap.xml') || !robots.includes('Disallow: /api/') || robots.includes('Disallow: /owner.html')) throw new Error('robots.txt is missing the sitemap/API rules or blocks the owner noindex route.');
const owner = fs.readFileSync(`${root}/owner.html`, 'utf8');
if (!/name="robots" content="noindex,nofollow"/.test(owner)) throw new Error('Owner page must remain noindex,nofollow.');
console.log(`SEO build verified: ${services.length} unique service pages, sitemap, robots, private-route exclusion, and byte-identical Google verification file.`);
