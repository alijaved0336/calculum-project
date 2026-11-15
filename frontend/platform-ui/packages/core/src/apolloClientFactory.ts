import { ApolloClient, InMemoryCache, InMemoryCacheConfig, createHttpLink } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import uuidRandom from 'uuid-random'

interface ApolloClientFactoryConfig {
  baseUri: string
  /** Path the GraphQL server is mounted at, appended to baseUri. Defaults to '/api/graphql'
   *  (API Platform's convention) - HotChocolate-based .NET APIs commonly mount at '/graphql' instead. */
  graphqlPath?: string
  typePolicies?: InMemoryCacheConfig['typePolicies']
  onAuthError?: () => Promise<void>
  debug?: boolean
}

const EXPECTED_ERROR_CODES = new Set(['NOT_FOUND', 'FORBIDDEN', 'BAD_USER_INPUT', 'RATE_LIMITED'])

export function createApolloClient({
  baseUri,
  graphqlPath = '/api/graphql',
  typePolicies = {},
  onAuthError,
  debug = false,
}: ApolloClientFactoryConfig) {
  let hasHandledAuthError = false

  const httpLink = createHttpLink({
    uri: `${baseUri}${graphqlPath}`,
    credentials: 'include',
  })

  const authLink = setContext(async (_, { headers }) => ({
    headers: { ...headers, idk: uuidRandom() },
  }))

  const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
    if (hasHandledAuthError) return

    const is401GraphQL = graphQLErrors?.some(
      e => e.extensions?.code === 'UNAUTHENTICATED' || e.message?.includes('401'),
    )
    const is401Network =
      networkError && 'statusCode' in networkError && (networkError as any).statusCode === 401

    if (is401GraphQL || is401Network) {
      const url = operation.getContext().uri ?? ''
      if (url.includes('/login') || url.includes('/session/info')) return forward(operation)

      hasHandledAuthError = true
      apolloClient.clearStore().catch(() => {})
      onAuthError?.().catch(() => {})
      return
    }

    if (debug && graphQLErrors) {
      const unexpected = graphQLErrors.filter(
        e =>
          !EXPECTED_ERROR_CODES.has(String(e.extensions?.code)) &&
          !e.message?.includes('Operation was canceled') &&
          !e.message?.includes('No operations found'),
      )
      if (unexpected.length) console.error('GraphQL Errors:', unexpected)
    }

    if (debug && networkError && !('name' in networkError && networkError.name === 'AbortError')) {
      console.error('Network Error:', networkError)
    }

    return forward(operation)
  })

  const cache = new InMemoryCache({ possibleTypes: {}, resultCaching: true, typePolicies })

  const apolloClient = new ApolloClient({
    link: errorLink.concat(authLink.concat(httpLink)),
    cache,
    assumeImmutableResults: true,
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network', errorPolicy: 'all', notifyOnNetworkStatusChange: true },
      query: { fetchPolicy: 'cache-first', errorPolicy: 'all' },
      mutate: { errorPolicy: 'all' },
    },
    queryDeduplication: true,
    clientAwareness: { name: 'ada-client', version: '1.0' },
    devtools: { enabled: false },
  })

  return apolloClient
}
