import { config, describeConfigWarnings } from "./src/config.js";
import { createApp } from "./src/app.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`GitGrade API listening on http://localhost:${config.port}`);
  for (const warning of describeConfigWarnings()) {
    console.warn(`  warning: ${warning}`);
  }
});
