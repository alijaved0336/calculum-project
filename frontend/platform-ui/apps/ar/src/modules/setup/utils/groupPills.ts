/**
 * AB#20733 / #20760: the soft pill colors the client's redesign cycles through for the
 * harmonization (H{n}) and Client Standard (CSG{n}) group badges.
 */
export const PILL_STYLES = [
  { backgroundColor: '#FEF0C7', color: '#B54708' },
  { backgroundColor: '#FEE4E2', color: '#B42318' },
  { backgroundColor: '#E0F2FE', color: '#026AA2' },
  { backgroundColor: '#D1FADF', color: '#027A48' },
]

export const pillStyle = (index: number) => PILL_STYLES[index % PILL_STYLES.length]
