import { useSubscribeStore } from '@/stores/subscribe'

const useShownotys = () => {    
  const subscribeStore = useSubscribeStore()

  function showProgramNotys(status: any) {
    if (import.meta.env.DEV) console.log('** showProgramNotys', status);
    if (status) {
      subscribeStore.setRefreshPrograms(status)
    }
  } 

  function setPlanStatusReactivity(status: any) {
    if (import.meta.env.DEV) console.log('** setPlanStatusReactivity', status);
    if (status) {
      subscribeStore.setSetRefeshPlans(status)
    }
  }

  function setSpendFileStatusReactivity(status: any) {
    if (import.meta.env.DEV) console.log('** setPlanStatusReactivity', status);
    if (status) {
      subscribeStore.setSetRefeshSpendFiles(status)
    }
  }



  return {
    showProgramNotys, setPlanStatusReactivity, setSpendFileStatusReactivity
  }
}

export default useShownotys;