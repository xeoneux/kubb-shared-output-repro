import type { PluginReactQuery } from '@kubb/plugin-react-query';
import { ast, Url } from 'kubb/kit';

// Copied from our repo: packages/shared/generators/react-query/{pagination,query-keys}.ts

/**
 * Page params for infinite hooks, copied into each hook as source code.
 *
 * Our pages are objects with a 0-based `number` and `hasNext`. The plugin's defaults expect arrays
 * and would never stop, so these use `hasNext` instead. `number` is optional, so they fall back to
 * the requested page.
 */
export const PAGE_PARAMS = {
  getNextPageParam:
    '(lastPage, _allPages, lastPageParam) => (lastPage.hasNext ? (lastPage.number ?? lastPageParam) + 1 : undefined)',
  getPreviousPageParam:
    '(firstPage, _allPages, firstPageParam) => ((firstPage.number ?? firstPageParam) > 0 ? (firstPage.number ?? firstPageParam) - 1 : undefined)',
};

/** The kind of hook a key is for, e.g. `infiniteQuery`. */
type KeyVariant = Parameters<NonNullable<PluginReactQuery['options']['queryKey']>>[0]['variant'];

/** Returns the key entries as source code. They can use the `path`, `query` and `body` params. */
type KeyTransformer = (props: { node: ast.OperationNode; variant?: KeyVariant }) => string[];

const INFINITE_VARIANTS: ReadonlySet<KeyVariant | undefined> = new Set([
  'infiniteQuery',
  'suspenseInfiniteQuery',
]);

const hasParams = (node: ast.OperationNode, location: ast.ParameterNode['in']): boolean =>
  node.parameters.some((param) => param.in === location);

const objectLiteral = (fields: Record<string, string>): string =>
  `{ ${Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ')} }`;

/**
 * Query keys shaped `[{ service, url, params? }, query?, body?]`.
 *
 * - `service` stops two packages with the same path from sharing a cache entry.
 * - Infinite hooks add `infinite: true`, because their cached data has a different shape. The plain
 *   key (or `[{ service }]`) still invalidates both.
 */
export const createQueryKey =
  (service: string): KeyTransformer =>
  ({ node, variant }) => {
    if (!ast.isHttpOperationNode(node)) return [];

    const scope = objectLiteral({
      service: JSON.stringify(service),
      url: JSON.stringify(Url.toPath(node.path)),
      ...(hasParams(node, 'path') ? { params: 'path' } : {}),
      ...(INFINITE_VARIANTS.has(variant) ? { infinite: 'true' } : {}),
    });

    return [
      scope,
      hasParams(node, 'query') ? '...(query ? [query] : [])' : null,
      node.requestBody?.content?.[0]?.schema ? '...(body ? [body] : [])' : null,
    ].filter((entry): entry is string => entry !== null);
  };

/** Mutation keys shaped `[{ service, url }]`, so `useMutationState` can filter by service. */
export const createMutationKey =
  (service: string): KeyTransformer =>
  ({ node }) =>
    ast.isHttpOperationNode(node)
      ? [
          objectLiteral({
            service: JSON.stringify(service),
            url: JSON.stringify(Url.toPath(node.path)),
          }),
        ]
      : [];
