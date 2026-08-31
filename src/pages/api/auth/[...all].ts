import type { APIRoute } from 'astro';
import { createAuth } from '../../../server/auth';

export const ALL: APIRoute = async ({ request }) => createAuth().handler(request);
