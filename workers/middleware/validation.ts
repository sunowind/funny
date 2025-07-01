import type { Context, Next } from 'hono';
import { z, type ZodSchema } from 'zod';

export interface ValidationTargets {
  json?: ZodSchema;
  query?: ZodSchema;
  param?: ZodSchema;
  header?: ZodSchema;
}

export function validate(targets: ValidationTargets) {
  return async (c: Context, next: Next) => {
    try {
      // Validate JSON body
      if (targets.json) {
        const body = await c.req.json().catch(() => ({}));
        const validated = targets.json.parse(body);
        c.set('validatedData', validated);
      }

      // Validate query parameters
      if (targets.query) {
        const query = c.req.query();
        const validated = targets.query.parse(query);
        c.set('validatedQuery', validated);
      }

      // Validate path parameters
      if (targets.param) {
        const param = c.req.param();
        const validated = targets.param.parse(param);
        c.set('validatedParam', validated);
      }

      // Validate headers
      if (targets.header) {
        const headers = Object.fromEntries(c.req.raw.headers.entries());
        const validated = targets.header.parse(headers);
        c.set('validatedHeader', validated);
      }

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid request data',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        }, 400);
      }
      
      return c.json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      }, 500);
    }
  };
}

// Helper function to get validated data from context
export function getValidatedData<T>(c: Context): T {
  return c.get('validatedData') as T;
}

export function getValidatedQuery<T>(c: Context): T {
  return c.get('validatedQuery') as T;
}

export function getValidatedParam<T>(c: Context): T {
  return c.get('validatedParam') as T;
}

export function getValidatedHeader<T>(c: Context): T {
  return c.get('validatedHeader') as T;
} 