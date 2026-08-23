/**
 * Vercel serverless entry point.
 *
 * Vercel turns every file in this directory into a function. Exporting the Express
 * app directly lets the same code serve `npm run dev` locally and serverless in
 * production - `server/index.js` is simply the long-running variant.
 *
 * Because the function lives on the same domain as the static frontend, requests
 * are same-origin and CORS never engages.
 */
import { createApp } from "../server/src/app.js";

export default createApp();
