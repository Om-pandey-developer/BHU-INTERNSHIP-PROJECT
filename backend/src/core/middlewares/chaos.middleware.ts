import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Ensure this uses real NestJS decorators depending on project setup
// Using standard ones if @nestjs/common is available.
import { Logger } from '@nestjs/common';

@Injectable()
export class ChaosMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ChaosMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'chaos') {
      return next();
    }

    // 10% chance to drop the request entirely (simulate network failure)
    const random = Math.random();
    if (random < 0.1) {
      this.logger.warn(`[CHAOS] Dropping request to ${req.url}`);
      return res.status(503).json({
        success: false,
        message: 'Service Unavailable - Chaos Monkey generated a simulated network drop.',
      });
    }

    // 20% chance to add intentional latency (simulate slow DB or network)
    if (random > 0.1 && random < 0.3) {
      const delay = Math.floor(Math.random() * 3000) + 1000; // 1s to 4s delay
      this.logger.warn(`[CHAOS] Injecting ${delay}ms latency to ${req.url}`);
      setTimeout(() => next(), delay);
      return;
    }

    // 70% chance to pass normally
    next();
  }
}
