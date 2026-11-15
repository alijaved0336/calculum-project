import { useQuery, useMutation, useSubscription } from '@vue/apollo-composable'
import { gql } from '@apollo/client/core'
import { computed, ref } from 'vue'
import { shouldShowErrorToasts } from '@/utils/axios'
import { useToast } from 'vue-toastification'

// Example Query
const EXAMPLE_QUERY = gql`
  query ExampleQuery($id: ID!) {
    item(id: $id) {
      id
      name
      description
    }
  }
`

// Example Mutation
const EXAMPLE_MUTATION = gql`
  mutation ExampleMutation($input: CreateItemInput!) {
    createItem(input: $input) {
      id
      name
      description
    }
  }
`

// Example Subscription
const EXAMPLE_SUBSCRIPTION = gql`
  subscription ExampleSubscription {
    itemUpdated {
      id
      name
      description
    }
  }
`

export function useExampleQuery(id: string) {
  const toast = useToast()
  
  const { result, loading, error, refetch } = useQuery(
    EXAMPLE_QUERY,
    { id },
    {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all'
    }
  )

  // Handle errors manually
  if (error.value && shouldShowErrorToasts()) {
    toast.error('Error loading data')
  }

  const item = computed(() => result.value?.item || null)
  
  return {
    item,
    loading,
    error,
    refetch
  }
}

export function useExampleMutation() {
  const toast = useToast()
  
  const { mutate, loading, error } = useMutation(EXAMPLE_MUTATION)

  // Handle errors manually
  if (error.value && shouldShowErrorToasts()) {
    toast.error('Error saving data')
  }

  const createItem = async (input: any) => {
    try {
      const result = await mutate({ input })
      if (shouldShowErrorToasts()) {
        toast.success('Data saved successfully')
      }
      return result
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Mutation execution error:', error)
      }
      throw error
    }
  }

  return {
    createItem,
    loading,
    error
  }
}

export function useExampleSubscription() {
  const toast = useToast()
  
  const { result, loading, error } = useSubscription(EXAMPLE_SUBSCRIPTION)

  // Handle errors manually
  if (error.value && shouldShowErrorToasts()) {
    toast.error('Subscription error')
  }

  const updatedItem = computed(() => result.value?.itemUpdated || null)
  
  return {
    updatedItem,
    loading,
    error
  }
}

// Utility function for dynamic queries (like the current graphqlUtils)
export function useDynamicQuery() {
  const toast = useToast()
  
  const executeQuery = async (queryString: string, variables: any = {}, options: any = {}) => {
    try {
      const { result, loading, error } = useQuery(
        gql`${queryString}`,
        variables,
        {
          fetchPolicy: 'cache-and-network',
          errorPolicy: 'all',
          ...options
        }
      )
      
      // Handle errors manually
      if (error.value && shouldShowErrorToasts()) {
        toast.error('Error executing query')
      }
      
      return { result, loading, error }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Dynamic query execution error:', error)
      }
      throw error
    }
  }

  return {
    executeQuery
  }
} 