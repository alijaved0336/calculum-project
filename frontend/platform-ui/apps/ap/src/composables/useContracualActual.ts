const useContractualActual = () => {
  const coolgray = "bg-coolgray-600";

  // Compute the background color for the main chart line
  const getBgColorForMainChartLineResult = () => {
    return coolgray; // Default fallback
  };

  return {    
    getBgColorForMainChartLineResult
  };
};

export default useContractualActual;
