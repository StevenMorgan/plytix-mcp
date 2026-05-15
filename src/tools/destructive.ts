/**
 * Destructive Tools
 *
 * Hard-delete operations that permanently remove data from Plytix. Kept in
 * their own registration group so they can be gated independently of regular
 * write tools — these tools are NOT registered unless the host explicitly
 * opts in (e.g. PLYTIX_ALLOW_DELETE=1).
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PlytixClient } from '../client.js';
import { registerTool } from './register.js';

export function registerDestructiveProductTools(server: McpServer, client: PlytixClient) {
  // ─────────────────────────────────────────────────────────────
  // products.delete - Hard-delete a product by ID
  // ─────────────────────────────────────────────────────────────

  registerTool<{ product_id: string; confirm: string }>(
    server,
    'products_delete',
    {
      title: 'Delete Product (HARD DELETE)',
      description:
        'WARNING: PERMANENTLY DELETES a product. This is a HARD delete via DELETE /api/v2/products/{id} — the product, its inline attribute values, its variants, and any relationship rows that point to it are removed. There is no undo. Linked assets and categories survive (only the link is broken). Prefer setting `status` to an archived value via products_update unless you are sure deletion is required. The `confirm` parameter must equal the literal string "DELETE" or the call is refused.',
      inputSchema: {
        product_id: z.string().min(1).describe('The product ID to permanently delete'),
        confirm: z
          .literal('DELETE')
          .describe('Must be the literal string "DELETE" to authorize the deletion'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ product_id, confirm }) => {
      if (confirm !== 'DELETE') {
        return {
          content: [
            {
              type: 'text',
              text: 'Refusing to delete: the `confirm` parameter must be the literal string "DELETE".',
            },
          ],
          isError: true,
        };
      }

      try {
        await client.deleteProduct(product_id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  deleted_id: product_id,
                  warning: 'Product permanently deleted. This cannot be undone.',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting product: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
