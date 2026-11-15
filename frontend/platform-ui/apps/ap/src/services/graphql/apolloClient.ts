import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { onError } from "@apollo/client/link/error";
import uuidRandom from "uuid-random";
import { authWarningState } from "@/utils/authWarningState";
import { getBaseApi } from "@/utils/getBaseApi";

// Helper function to check if an error is an expected error
const isExpectedError = (error: any) => {
  const code = error.extensions?.code;
  return (
    code === 'NOT_FOUND' ||
    code === 'FORBIDDEN' ||
    code === 'BAD_USER_INPUT' ||
    code === 'RATE_LIMITED' ||
    error.message?.includes('Operation was canceled') ||
    error.message?.includes('No operations found')
  );
};

const httpLink = createHttpLink({
  uri: getBaseApi() + "/api/graphql",
  credentials: 'include'
});

const authLink = setContext(async (_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const idempotencyKey = uuidRandom();

  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      idk: idempotencyKey
    }
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  // Early return if we're already handling auth error
  if (authWarningState.hasShown401Warning || authWarningState.isRedirecting) {
    return;
  }

  // Handle GraphQL errors
  if (graphQLErrors) {
    // Check for 401/auth errors first
    const has401Error = graphQLErrors.some(error => 
      error.extensions?.code === 'UNAUTHENTICATED' || 
      error.message?.includes('401')
    );

    if (has401Error) {
      const url = operation.getContext().uri || '';
      if (url.includes('/login') || url.includes('/session/info')) {
        return forward(operation);
      }

      // Clear Apollo cache and handle auth error
      apolloClient.clearStore().catch(error => {
        if (import.meta.env.DEV) console.error('Error clearing Apollo store:', error);
      });

      authWarningState.handleAuthError().catch(error => {
        if (import.meta.env.DEV) console.error('Error handling auth error:', error);
      });

      return;
    }

    // Filter out expected errors
    const unexpectedErrors = graphQLErrors.filter(error => !isExpectedError(error));

    // Only log unexpected errors in debug mode
    if (import.meta.env.DEV && unexpectedErrors.length > 0) {
      console.error('Unexpected GraphQL Errors:', unexpectedErrors);
    } else if (unexpectedErrors.length > 0) {
      // Log a more user-friendly message in production
      console.warn('GraphQL query encountered some issues. Please try again or contact support if the problem persists.');
    }
  }

  // Handle network errors
  if (networkError) {
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      const url = operation.getContext().uri || '';
      if (url.includes('/login') || url.includes('/session/info')) {
        return forward(operation);
      }

      // Clear Apollo cache and handle auth error
      apolloClient.clearStore().catch(error => {
        if (import.meta.env.DEV) console.error('Error clearing Apollo store:', error);
      });

      authWarningState.handleAuthError().catch(error => {
        if (import.meta.env.DEV) console.error('Error handling auth error:', error);
      });

      return;
    }

    // Only log non-abort network errors in debug mode
    if (import.meta.env.DEV && 'name' in networkError && networkError.name !== 'AbortError') {
      console.error('Network Error:', { 
        message: networkError.message,
        name: networkError.name,
        stack: networkError.stack
      });
    }
  }

  // Forward operation for other errors
  return forward(operation);
});

// Create cache with type policies
const cache = new InMemoryCache({
  possibleTypes: {}, // Disable automatic type inference
  // Agregar configuración de límites de memoria
  resultCaching: true,
  typePolicies: {
    Query: {
      fields: {
        spends: {
          merge(existing, incoming) {
            return incoming;
          },
          // Agregar límite de caché
          read(existing) {
            return existing;
          }
        },
        suppliers: {
          merge(existing, incoming) {
            return incoming;
          },
          read(existing) {
            return existing;
          }
        },
        parents: {
          merge(existing, incoming) {
            return incoming;
          },
          read(existing) {
            return existing;
          }
        }
      }
    },
    Spend: {
      keyFields: ['uuid']
    },
    CompareCompany: {
      keyFields: ['uuid']
    },
    Supplier: {
      keyFields: ['uuid']
    },
    Parent: {
      keyFields: ['uuid']
    }
  }
});

export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache,
  assumeImmutableResults: true,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all'
    },
    mutate: {
      errorPolicy: 'all'
    }
  },
  queryDeduplication: true,
  clientAwareness: {
    name: 'ada-client',
    version: '1.0'
  },
  devtools: {
    enabled: false // Disable devtools connection
  }
});

