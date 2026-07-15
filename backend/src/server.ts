import { app } from '@/app.js';
import { env } from '@/config/env.config.js';

const server = app.listen(env.PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

export { server };
