import { Request, Response, NextFunction } from 'express';

/**
 * PRIVACY SHIELD MIDDLEWARE
 * ─────────────────────────────────────────────────────────────────────────
 * Sits at the very FIRST position in the Express middleware chain.
 *
 * Zero-PII / Zero-IP Policy:
 *   1. Strips all real-IP headers forwarded by proxies / CDNs.
 *   2. Overwrites req.ip and req.socket.remoteAddress to '0.0.0.0'.
 *   3. Removes identifying metadata from the request before it reaches
 *      any logger, controller, or database layer.
 *
 * Headers scrubbed:
 *   x-forwarded-for, x-real-ip, cf-connecting-ip, true-client-ip,
 *   x-client-ip, x-cluster-client-ip, forwarded, x-originating-ip
 * ─────────────────────────────────────────────────────────────────────────
 */
export function privacyShield(req: Request, _res: Response, next: NextFunction): void {
  const sensitiveHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'true-client-ip',
    'x-client-ip',
    'x-cluster-client-ip',
    'x-originating-ip',
    'forwarded',
    'via',
    'x-proxyuser-ip',
  ];

  for (const header of sensitiveHeaders) {
    delete req.headers[header];
  }

  // Override Express's computed req.ip property
  Object.defineProperty(req, 'ip', {
    get: () => '0.0.0.0',
    configurable: true,
  });

  // Also scrub the underlying socket address
  if (req.socket) {
    try {
      Object.defineProperty(req.socket, 'remoteAddress', {
        get: () => '0.0.0.0',
        configurable: true,
      });
    } catch {
      // Ignore if socket property is not configurable
    }
  }

  next();
}
