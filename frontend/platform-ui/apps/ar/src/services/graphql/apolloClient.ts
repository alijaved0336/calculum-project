import { createApolloClient } from '@ada/core'
import { getBaseApi } from '@/utils/getBaseApi'

export const apolloClient = createApolloClient({
  baseUri: getBaseApi(),
  // Ada.Ar.Api mounts HotChocolate with the default app.MapGraphQL() path, i.e. '/api/graphql'  
  graphqlPath: '/api/graphql',
})
