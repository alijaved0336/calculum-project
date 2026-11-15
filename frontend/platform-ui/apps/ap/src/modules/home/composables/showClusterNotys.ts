import { useSubscribeStore } from '@/stores/subscribe'
const useClusterShowNotys = () => {    
  const subscribeStore = useSubscribeStore()

  function showClusterStatusNotys(data: any) {

    if (data?.supplierStandardClustersStatus) {
      subscribeStore.setSupplierStandardClusterStatus(data.supplierStandardClustersStatus)
    }
    if (data?.peerGroupClustersStatus) {
      subscribeStore.setPeerStandardClusterStatus(data.peerGroupClustersStatus)
    }
  }

  return {
    showClusterStatusNotys
  }
}

export default useClusterShowNotys;