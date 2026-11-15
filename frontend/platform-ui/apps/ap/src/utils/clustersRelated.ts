import { nodeEdgesSupplierStandard } from "@/modules/adminBackend/data/clusters/supplierStandard/nodeEdgesSupplierStandard";
import { nodesEdgesPeerGroupStandard } from "@/modules/adminBackend/data/clusters/peerGroupStandard/nodesEdgesPeerGroupStandard";
import { useSubscribeStore } from "@/stores/subscribe";



export function updateStatusClusters(callbackSuccessData: any) {
  const subscribeStore = useSubscribeStore();

  let peerGroupObjectRelated = {
    peerGroupClustersLastDate:
      callbackSuccessData.peerGroupClustersLastDate,
    peerGroupClustersLastVersion:
      callbackSuccessData.peerGroupClustersLastVersion,
    peerGroupClustersMaxPeriod:
      callbackSuccessData.peerGroupClustersMaxPeriod,
    peerGroupClustersMinCompanies:
      callbackSuccessData.peerGroupClustersMinCompanies,
    peerGroupClustersStatus:
      callbackSuccessData.peerGroupClustersStatus,
  };

    let supplierStandardObjectRelated = {
      supplierStandardClustersLastDate:
        callbackSuccessData.supplierStandardClustersLastDate,
      supplierStandardClustersLastVersion:
        callbackSuccessData.supplierStandardClustersLastVersion,
      supplierStandardClustersMaxPeriod:
        callbackSuccessData.supplierStandardClustersMaxPeriod,
      supplierStandardClustersMinCompanies:
        callbackSuccessData.supplierStandardClustersMinCompanies,
      supplierStandardClustersStatus:
        callbackSuccessData.supplierStandardClustersStatus,
    };

    subscribeStore.setPeerGroupClustersLastDate(peerGroupObjectRelated.peerGroupClustersLastDate);
    subscribeStore.setPeerStandardClusterVersion(peerGroupObjectRelated.peerGroupClustersLastVersion);
    subscribeStore.setPeerStandardClusterStatus(peerGroupObjectRelated.peerGroupClustersStatus);
    
    subscribeStore.setSupplierStandardClustersLastDate(supplierStandardObjectRelated.supplierStandardClustersLastDate);
    subscribeStore.setSupplierStandardClusterVersion(supplierStandardObjectRelated.supplierStandardClustersLastVersion);
    subscribeStore.setSupplierStandardClusterStatus(supplierStandardObjectRelated.supplierStandardClustersStatus);
}


export function getSpecificClusterLastVersion(clusterType: string) {
  const subscribeStore = useSubscribeStore();
  
  switch (clusterType) {
    case "supplierStandard":
      return subscribeStore.getSupplierStandardClusterVersion ? subscribeStore.getSupplierStandardClusterVersion : null;
    case "peerGroup":
      return subscribeStore.getPeerStandardClusterVersion ? subscribeStore.getPeerStandardClusterVersion : null;
    default:
      return null;
  }
}

export function getSpecificClusterLastDate(clusterType: string) {
  const subscribeStore = useSubscribeStore();
  
  switch (clusterType) {
    case "supplierStandard":
      return subscribeStore.getSupplierStandardClustersLastDate
        ? formatDateForInput(
            subscribeStore.getSupplierStandardClustersLastDate
          )
        : null;
    case "peerGroup":
      return subscribeStore.getPeerGroupClustersLastDate
        ? formatDateForInput(
            subscribeStore.getPeerGroupClustersLastDate
          )
        : null;
    default:
      return null;
  }
}

export function getSpecificClusterStatus(clusterType: string) {
  const subscribeStore = useSubscribeStore();
  
  switch (clusterType) {
    case "supplierStandard":
      return subscribeStore.getSupplierStandardClusterStatus ? subscribeStore.getSupplierStandardClusterStatus : null;
    case "peerGroup":
      return subscribeStore.getPeerStandardClusterStatus ? subscribeStore.getPeerStandardClusterStatus : null;
    default:
      return null;
  }
}

export function getClusterLastVersion(
  clusterType: string,
  callbackSuccessData: any
) {
  switch (clusterType) {
    case "supplierStandard":
      return callbackSuccessData.supplierStandardClustersLastVersion ?? 0;
    case "peerGroup":
      return callbackSuccessData.peerGroupClustersLastVersion ?? 0;
    default:
      return null;
  }
}

export function getClusterLastDate(
  clusterType: string,
  callbackSuccessData: any
) {
  switch (clusterType) {
    case "supplierStandard":
      return callbackSuccessData?.supplierStandardClustersLastDate ? formatDateForInput(
        callbackSuccessData.supplierStandardClustersLastDate
      ) : null;
    case "peerGroup":
      return callbackSuccessData?.peerGroupClustersLastDate ? formatDateForInput(callbackSuccessData.peerGroupClustersLastDate): null;
    default:
      return null;
  }
}

export function saveTheSpecificClusterVersion(
  clusterType: string,
  callbackSuccessData: any
) {
  const subscribeStore = useSubscribeStore();
  
  switch (clusterType) {
    case "supplierStandard":
      subscribeStore.setSupplierStandardClusterVersion(
        callbackSuccessData.supplierStandardClustersLastVersion ?? 0
      );
      break;
    case "peerGroup":
      subscribeStore.setPeerStandardClusterVersion(
        callbackSuccessData.peerGroupClustersLastVersion ?? 0
      );
      break;
    default:
      break;
  }
}

export function getClusterStatus(
  clusterType: string,
  callbackSuccessData: any
): boolean {

  switch (clusterType) {
    case "supplierStandard":
      return callbackSuccessData?.supplierStandardClustersStatus === "ready"
        ? false
        : true;
    case "peerGroup":
      return callbackSuccessData?.peerGroupClustersStatus === "ready"
        ? false
        : true;
    default:
      return false;
  }
}

export  function getClusterNodeEdges(clusterType: string) {
  switch (clusterType) {
    case "supplierStandard":
      return nodeEdgesSupplierStandard;
    case "peerGroup":
      return nodesEdgesPeerGroupStandard;
    default:
      return nodesEdgesPeerGroupStandard;
  }
}

export function getCollectionNameForQuery(clusterType: string) {
  switch (clusterType) {
    case "supplierStandard":
      return "collectionQuerySupplierStandardClusters";
    case "peerGroup":
      return "collectionQueryPeerGroupClusters";
    default:
      return "collectionQueryPeerGroupClusters";
  }
}

function formatDateForInput(date: string): string {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new Error("Invalid date string");
  }

  const pad = (n: number) => (n < 10 ? "0" + n : n.toString());

  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hour = pad(dateObj.getHours());
  const minute = pad(dateObj.getMinutes());

  return `${year}-${month}-${day} ${hour}:${minute}`;
}
