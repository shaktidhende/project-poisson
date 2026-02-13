import { createApp } from './src/app.js';
import { PORT } from './src/config/constants.js';

const app = createApp();

app.listen(PORT, () => {
  console.log(`DentalEMR running at http://localhost:${PORT}`);
});
