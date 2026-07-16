import { app } from '@/app.js';
import { config } from '@/config/index.js';
import { connectDB } from '@/config/database.js';

try {
  await connectDB();
} catch (error) {
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export { server };
